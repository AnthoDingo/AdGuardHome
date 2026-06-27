package dnsforward

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/netip"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ipDenyBaseURL is the base URL for fetching country IP zone files.
const ipDenyBaseURL = "https://www.ipdeny.com/ipblocks/data/countries/%s.zone"

// maxZoneFileSize is the maximum number of bytes we read from a zone file.
// A typical large country zone (e.g. CN) is ~500 KiB; 8 MiB is a safe ceiling
// that prevents memory exhaustion from a malicious or corrupted response.
const maxZoneFileSize = 8 * 1024 * 1024

// countryCodeRe accepts only strictly two lowercase ASCII letters (ISO 3166-1
// alpha-2).  This prevents SSRF / path-traversal through the country-code
// field that is interpolated into the ipdeny.com URL path.
var countryCodeRe = regexp.MustCompile(`^[a-z]{2}$`)

// prefixTree is a simple radix-like structure for fast IP-prefix lookup.
// IPv4 and IPv6 prefixes are stored in separate sorted slices; lookup is a
// sequential scan protected by the parent RWMutex.
//
// For the typical deployment (a handful of countries, 1 000 – 10 000 prefixes
// total) a sorted-slice approach is fast enough in practice.  If the number
// of prefixes grows into the tens of thousands an interval-tree or trie can
// replace this struct transparently.
type prefixTree struct {
	v4 []netip.Prefix
	v6 []netip.Prefix
}

// contains reports whether ip is covered by any prefix in the tree.
func (t *prefixTree) contains(ip netip.Addr) bool {
	// Strip link-local zone before matching (prefixes never carry zones).
	ip = ip.WithZone("")

	prefixes := t.v4
	if ip.Is6() {
		prefixes = t.v6
	}

	for _, p := range prefixes {
		if p.Contains(ip) {
			return true
		}
	}

	return false
}

// total returns the combined number of prefixes.
func (t *prefixTree) total() int { return len(t.v4) + len(t.v6) }

// countryBlocker manages blocked IP ranges per country code.  A countryBlocker
// is safe for concurrent use.
type countryBlocker struct {
	// mu protects tree and perCountry.
	mu sync.RWMutex

	// tree is the merged, split-by-family lookup structure.
	tree prefixTree

	// perCountry stores per-country prefix slices for diagnostics.
	perCountry map[string][]netip.Prefix

	// logger is used to log operations.
	logger *slog.Logger

	// httpClient is used to fetch the IP zone files.
	httpClient *http.Client
}

// newCountryBlocker creates a new countryBlocker.
func newCountryBlocker(logger *slog.Logger) *countryBlocker {
	return &countryBlocker{
		perCountry: make(map[string][]netip.Prefix),
		logger:     logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// buildPrefixTree constructs a split-by-family prefixTree from a per-country
// prefix map.  Separating this step keeps update's cognitive complexity low.
func buildPrefixTree(perCountry map[string][]netip.Prefix) (t prefixTree) {
	for _, ps := range perCountry {
		for _, p := range ps {
			if p.Addr().Is4() || p.Addr().Is4In6() {
				t.v4 = append(t.v4, p)
			} else {
				t.v6 = append(t.v6, p)
			}
		}
	}

	return t
}

// update fetches IP ranges for the given country codes and replaces the current
// set of blocked prefixes.  Each code must be a two-letter ISO 3166-1 alpha-2
// string (e.g. "fr", "us").  Invalid codes are rejected immediately; fetch
// errors for individual countries are logged and skipped so that other
// countries can still be loaded.
func (cb *countryBlocker) update(ctx context.Context, countryCodes []string) error {
	newPerCountry := make(map[string][]netip.Prefix, len(countryCodes))

	for _, raw := range countryCodes {
		code := strings.ToLower(strings.TrimSpace(raw))

		// FIX #1 — validate country code strictly before interpolating into URL
		// (prevents SSRF / path traversal).
		if !countryCodeRe.MatchString(code) {
			cb.logger.WarnContext(ctx, "invalid country code; skipping", "code", raw)

			continue
		}

		prefixes, err := cb.fetchCountry(ctx, code)
		if err != nil {
			// Log but continue — other countries can still be loaded.
			cb.logger.WarnContext(
				ctx,
				"failed to fetch country IP ranges",
				"country", code,
				"err", err,
			)

			continue
		}

		newPerCountry[code] = prefixes
		cb.logger.InfoContext(
			ctx,
			"loaded country IP ranges",
			"country", code,
			"count", len(prefixes),
		)
	}

	cb.mu.Lock()
	cb.perCountry = newPerCountry
	cb.tree = buildPrefixTree(newPerCountry)
	cb.mu.Unlock()

	return nil
}

// fetchCountry downloads and parses the zone file for a single country code.
// The code must already have been validated by countryCodeRe.
func (cb *countryBlocker) fetchCountry(ctx context.Context, code string) ([]netip.Prefix, error) {
	url := fmt.Sprintf(ipDenyBaseURL, code)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := cb.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching %s: %w", url, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bad status from %s: %s", url, resp.Status)
	}

	// FIX #2 — limit response size to prevent memory exhaustion from a
	// malicious or corrupted zone file.
	limited := io.LimitReader(resp.Body, maxZoneFileSize)

	return parsePrefixes(limited)
}

// parsePrefixes reads CIDR blocks, one per line, from r.
func parsePrefixes(r io.Reader) ([]netip.Prefix, error) {
	var prefixes []netip.Prefix

	sc := bufio.NewScanner(r)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		p, err := netip.ParsePrefix(line)
		if err != nil {
			// Silently skip malformed lines.
			continue
		}

		prefixes = append(prefixes, p.Masked())
	}

	return prefixes, sc.Err()
}

// isBlockedIP returns true if ip is covered by any of the blocked country
// prefixes.
//
// FIX #3 — IPv4 and IPv6 prefixes are stored in separate slices so each
// lookup only iterates over the relevant half of the prefix space, roughly
// halving the worst-case scan cost.
func (cb *countryBlocker) isBlockedIP(ip netip.Addr) bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	return cb.tree.contains(ip)
}

// len returns the total number of blocked prefixes currently loaded.
func (cb *countryBlocker) len() int {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	return cb.tree.total()
}

// countries returns a copy of the currently loaded country codes.
func (cb *countryBlocker) countries() []string {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	codes := make([]string, 0, len(cb.perCountry))
	for code := range cb.perCountry {
		codes = append(codes, code)
	}

	return codes
}
