import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Full list of countries with their ISO 2-letter codes.
const COUNTRIES: { code: string; name: string }[] = [
    { code: 'af', name: 'Afghanistan' },
    { code: 'al', name: 'Albania' },
    { code: 'dz', name: 'Algeria' },
    { code: 'ad', name: 'Andorra' },
    { code: 'ao', name: 'Angola' },
    { code: 'ag', name: 'Antigua and Barbuda' },
    { code: 'ar', name: 'Argentina' },
    { code: 'am', name: 'Armenia' },
    { code: 'au', name: 'Australia' },
    { code: 'at', name: 'Austria' },
    { code: 'az', name: 'Azerbaijan' },
    { code: 'bs', name: 'Bahamas' },
    { code: 'bh', name: 'Bahrain' },
    { code: 'bd', name: 'Bangladesh' },
    { code: 'bb', name: 'Barbados' },
    { code: 'by', name: 'Belarus' },
    { code: 'be', name: 'Belgium' },
    { code: 'bz', name: 'Belize' },
    { code: 'bj', name: 'Benin' },
    { code: 'bt', name: 'Bhutan' },
    { code: 'bo', name: 'Bolivia' },
    { code: 'ba', name: 'Bosnia and Herzegovina' },
    { code: 'bw', name: 'Botswana' },
    { code: 'br', name: 'Brazil' },
    { code: 'bn', name: 'Brunei' },
    { code: 'bg', name: 'Bulgaria' },
    { code: 'bf', name: 'Burkina Faso' },
    { code: 'bi', name: 'Burundi' },
    { code: 'cv', name: 'Cabo Verde' },
    { code: 'kh', name: 'Cambodia' },
    { code: 'cm', name: 'Cameroon' },
    { code: 'ca', name: 'Canada' },
    { code: 'cf', name: 'Central African Republic' },
    { code: 'td', name: 'Chad' },
    { code: 'cl', name: 'Chile' },
    { code: 'cn', name: 'China' },
    { code: 'co', name: 'Colombia' },
    { code: 'km', name: 'Comoros' },
    { code: 'cd', name: 'Congo (DRC)' },
    { code: 'cg', name: 'Congo (Republic)' },
    { code: 'cr', name: 'Costa Rica' },
    { code: 'hr', name: 'Croatia' },
    { code: 'cu', name: 'Cuba' },
    { code: 'cy', name: 'Cyprus' },
    { code: 'cz', name: 'Czech Republic' },
    { code: 'dk', name: 'Denmark' },
    { code: 'dj', name: 'Djibouti' },
    { code: 'dm', name: 'Dominica' },
    { code: 'do', name: 'Dominican Republic' },
    { code: 'ec', name: 'Ecuador' },
    { code: 'eg', name: 'Egypt' },
    { code: 'sv', name: 'El Salvador' },
    { code: 'gq', name: 'Equatorial Guinea' },
    { code: 'er', name: 'Eritrea' },
    { code: 'ee', name: 'Estonia' },
    { code: 'sz', name: 'Eswatini' },
    { code: 'et', name: 'Ethiopia' },
    { code: 'fj', name: 'Fiji' },
    { code: 'fi', name: 'Finland' },
    { code: 'fr', name: 'France' },
    { code: 'ga', name: 'Gabon' },
    { code: 'gm', name: 'Gambia' },
    { code: 'ge', name: 'Georgia' },
    { code: 'de', name: 'Germany' },
    { code: 'gh', name: 'Ghana' },
    { code: 'gr', name: 'Greece' },
    { code: 'gd', name: 'Grenada' },
    { code: 'gt', name: 'Guatemala' },
    { code: 'gn', name: 'Guinea' },
    { code: 'gw', name: 'Guinea-Bissau' },
    { code: 'gy', name: 'Guyana' },
    { code: 'ht', name: 'Haiti' },
    { code: 'hn', name: 'Honduras' },
    { code: 'hu', name: 'Hungary' },
    { code: 'is', name: 'Iceland' },
    { code: 'in', name: 'India' },
    { code: 'id', name: 'Indonesia' },
    { code: 'ir', name: 'Iran' },
    { code: 'iq', name: 'Iraq' },
    { code: 'ie', name: 'Ireland' },
    { code: 'il', name: 'Israel' },
    { code: 'it', name: 'Italy' },
    { code: 'jm', name: 'Jamaica' },
    { code: 'jp', name: 'Japan' },
    { code: 'jo', name: 'Jordan' },
    { code: 'kz', name: 'Kazakhstan' },
    { code: 'ke', name: 'Kenya' },
    { code: 'ki', name: 'Kiribati' },
    { code: 'kw', name: 'Kuwait' },
    { code: 'kg', name: 'Kyrgyzstan' },
    { code: 'la', name: 'Laos' },
    { code: 'lv', name: 'Latvia' },
    { code: 'lb', name: 'Lebanon' },
    { code: 'ls', name: 'Lesotho' },
    { code: 'lr', name: 'Liberia' },
    { code: 'ly', name: 'Libya' },
    { code: 'li', name: 'Liechtenstein' },
    { code: 'lt', name: 'Lithuania' },
    { code: 'lu', name: 'Luxembourg' },
    { code: 'mg', name: 'Madagascar' },
    { code: 'mw', name: 'Malawi' },
    { code: 'my', name: 'Malaysia' },
    { code: 'mv', name: 'Maldives' },
    { code: 'ml', name: 'Mali' },
    { code: 'mt', name: 'Malta' },
    { code: 'mh', name: 'Marshall Islands' },
    { code: 'mr', name: 'Mauritania' },
    { code: 'mu', name: 'Mauritius' },
    { code: 'mx', name: 'Mexico' },
    { code: 'fm', name: 'Micronesia' },
    { code: 'md', name: 'Moldova' },
    { code: 'mc', name: 'Monaco' },
    { code: 'mn', name: 'Mongolia' },
    { code: 'me', name: 'Montenegro' },
    { code: 'ma', name: 'Morocco' },
    { code: 'mz', name: 'Mozambique' },
    { code: 'mm', name: 'Myanmar' },
    { code: 'na', name: 'Namibia' },
    { code: 'nr', name: 'Nauru' },
    { code: 'np', name: 'Nepal' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'nz', name: 'New Zealand' },
    { code: 'ni', name: 'Nicaragua' },
    { code: 'ne', name: 'Niger' },
    { code: 'ng', name: 'Nigeria' },
    { code: 'kp', name: 'North Korea' },
    { code: 'mk', name: 'North Macedonia' },
    { code: 'no', name: 'Norway' },
    { code: 'om', name: 'Oman' },
    { code: 'pk', name: 'Pakistan' },
    { code: 'pw', name: 'Palau' },
    { code: 'pa', name: 'Panama' },
    { code: 'pg', name: 'Papua New Guinea' },
    { code: 'py', name: 'Paraguay' },
    { code: 'pe', name: 'Peru' },
    { code: 'ph', name: 'Philippines' },
    { code: 'pl', name: 'Poland' },
    { code: 'pt', name: 'Portugal' },
    { code: 'qa', name: 'Qatar' },
    { code: 'ro', name: 'Romania' },
    { code: 'ru', name: 'Russia' },
    { code: 'rw', name: 'Rwanda' },
    { code: 'kn', name: 'Saint Kitts and Nevis' },
    { code: 'lc', name: 'Saint Lucia' },
    { code: 'vc', name: 'Saint Vincent and the Grenadines' },
    { code: 'ws', name: 'Samoa' },
    { code: 'sm', name: 'San Marino' },
    { code: 'st', name: 'Sao Tome and Principe' },
    { code: 'sa', name: 'Saudi Arabia' },
    { code: 'sn', name: 'Senegal' },
    { code: 'rs', name: 'Serbia' },
    { code: 'sc', name: 'Seychelles' },
    { code: 'sl', name: 'Sierra Leone' },
    { code: 'sg', name: 'Singapore' },
    { code: 'sk', name: 'Slovakia' },
    { code: 'si', name: 'Slovenia' },
    { code: 'sb', name: 'Solomon Islands' },
    { code: 'so', name: 'Somalia' },
    { code: 'za', name: 'South Africa' },
    { code: 'ss', name: 'South Sudan' },
    { code: 'es', name: 'Spain' },
    { code: 'lk', name: 'Sri Lanka' },
    { code: 'sd', name: 'Sudan' },
    { code: 'sr', name: 'Suriname' },
    { code: 'se', name: 'Sweden' },
    { code: 'ch', name: 'Switzerland' },
    { code: 'sy', name: 'Syria' },
    { code: 'tw', name: 'Taiwan' },
    { code: 'tj', name: 'Tajikistan' },
    { code: 'tz', name: 'Tanzania' },
    { code: 'th', name: 'Thailand' },
    { code: 'tl', name: 'Timor-Leste' },
    { code: 'tg', name: 'Togo' },
    { code: 'to', name: 'Tonga' },
    { code: 'tt', name: 'Trinidad and Tobago' },
    { code: 'tn', name: 'Tunisia' },
    { code: 'tr', name: 'Turkey' },
    { code: 'tm', name: 'Turkmenistan' },
    { code: 'tv', name: 'Tuvalu' },
    { code: 'ug', name: 'Uganda' },
    { code: 'ua', name: 'Ukraine' },
    { code: 'ae', name: 'United Arab Emirates' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'us', name: 'United States' },
    { code: 'uy', name: 'Uruguay' },
    { code: 'uz', name: 'Uzbekistan' },
    { code: 'vu', name: 'Vanuatu' },
    { code: 've', name: 'Venezuela' },
    { code: 'vn', name: 'Vietnam' },
    { code: 'ye', name: 'Yemen' },
    { code: 'zm', name: 'Zambia' },
    { code: 'zw', name: 'Zimbabwe' },
];

type CountrySelectorProps = {
    value: string[];
    onChange: (codes: string[]) => void;
    disabled?: boolean;
};

const CountrySelector = ({ value, onChange, disabled }: CountrySelectorProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const selected = new Set(value);

    const filtered = COUNTRIES.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.code.toLowerCase().includes(search.toLowerCase()),
    );

    const toggleCountry = (code: string) => {
        if (selected.has(code)) {
            onChange(value.filter((c) => c !== code));
        } else {
            onChange([...value, code]);
        }
    };

    const clearAll = () => onChange([]);

    return (
        <div className="country-selector">
            {/* Selected badges */}
            {value.length > 0 && (
                <div className="country-selector__selected mb-2">
                    {value.map((code) => {
                        const country = COUNTRIES.find((c) => c.code === code);
                        return (
                            <span key={code} className="badge badge-secondary mr-1 mb-1" style={{ fontSize: '0.8em', padding: '4px 8px' }}>
                                {country?.name ?? code.toUpperCase()}
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="btn-close ml-1"
                                        aria-label={t('remove')}
                                        onClick={() => toggleCountry(code)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0 0 0 4px',
                                            color: 'inherit',
                                            fontSize: '0.9em',
                                            lineHeight: 1,
                                        }}>
                                        ✕
                                    </button>
                                )}
                            </span>
                        );
                    })}
                    {!disabled && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary ml-1"
                            onClick={clearAll}
                            style={{ fontSize: '0.75em' }}>
                            {t('clear_all')}
                        </button>
                    )}
                </div>
            )}

            {/* Search + list */}
            {!disabled && (
                <>
                    <input
                        type="text"
                        className="form-control mb-2"
                        placeholder={t('country_search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div
                        className="country-selector__list border rounded"
                        style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div className="p-2 text-muted" style={{ fontSize: '0.9em' }}>
                                {t('no_results')}
                            </div>
                        ) : (
                            filtered.map((c) => (
                                <label
                                    key={c.code}
                                    className="d-flex align-items-center px-3 py-1"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: selected.has(c.code) ? 'rgba(0,123,255,0.08)' : undefined,
                                        margin: 0,
                                    }}>
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={selected.has(c.code)}
                                        onChange={() => toggleCountry(c.code)}
                                    />
                                    <span style={{ fontSize: '0.9em' }}>
                                        <span
                                            className="text-muted mr-1"
                                            style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                                            {c.code.toUpperCase()}
                                        </span>
                                        {c.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CountrySelector;
