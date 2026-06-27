package dnsforward

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"
)

// ipDenyBaseURL is the base URL for fetching country IP zone files.
const ipDenyBaseURL = "https://www.ipdeny.com/ipblocks/data/countries/%s.zone"

// countryBlocker manages blocked IP ranges per country code.  A countryBlocker
// is safe for concurrent use.
type countryBlocker struct {
	// mu protects prefixes.
	mu sync.RWMutex

	// prefixes stores all blocked IP prefixes indexed by country code.
	prefixes map[string][]netip.Prefix

	// allPrefixes is the merged list of all blocked prefixes across all
	// blocked countries, rebuilt on each update.
	allPrefixes []netip.Prefix

	// logger is used to log operations.
	logger *slog.Logger

	// httpClient is used to fetch the IP zone files.
	httpClient *http.Client
}

// newCountryBlocker creates a new countryBlocker.
func newCountryBlocker(logger *slog.Logger) *countryBlocker {
	return &countryBlocker{
		prefixes: make(map[string][]netip.Prefix),
		logger:   logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// update fetches IP ranges for the given country codes and replaces the current
// set of blocked prefixes.  countryCodes must be lowercase two-letter ISO codes
// (e.g. "fr", "us").
func (cb *countryBlocker) update(ctx context.Context, countryCodes []string) error {
	newPrefixes := make(map[string][]netip.Prefix)

	for _, code := range countryCodes {
		code = strings.ToLower(strings.TrimSpace(code))
		if code == "" {
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

		newPrefixes[code] = prefixes
		cb.logger.InfoContext(
			ctx,
			"loaded country IP ranges",
			"country", code,
			"count", len(prefixes),
		)
	}

	// Rebuild merged list.
	var all []netip.Prefix
	for _, ps := range newPrefixes {
		all = append(all, ps...)
	}

	cb.mu.Lock()
	cb.prefixes = newPrefixes
	cb.allPrefixes = all
	cb.mu.Unlock()

	return nil
}

// fetchCountry downloads and parses the zone file for a single country code.
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

	return parsePrefixes(resp.Body)
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
func (cb *countryBlocker) isBlockedIP(ip netip.Addr) bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	// Strip zone identifier before matching.
	ip = ip.WithZone("")

	for _, p := range cb.allPrefixes {
		if p.Contains(ip) {
			return true
		}
	}

	return false
}

// len returns the total number of blocked prefixes currently loaded.
func (cb *countryBlocker) len() int {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	return len(cb.allPrefixes)
}

// countries returns a sorted copy of the currently loaded country codes.
func (cb *countryBlocker) countries() []string {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	codes := make([]string, 0, len(cb.prefixes))
	for code := range cb.prefixes {
		codes = append(codes, code)
	}

	return codes
}
