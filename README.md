# COORDS

A single-file WGS84 coordinate converter. Opens in live GPS tracking mode and round-trips between DD, DDM, DMS, UTM, MGRS, ECEF, `geo:` URI, Plus Code, and Geohash.

No build, no dependencies — `coords.html` is the whole app.

## Features

- **Live tracking on load.** Uses `navigator.geolocation.watchPosition`, so the fields follow your position as you move. Each fix shows accuracy (`±Nm`) and timestamp.
- **Manual override, any time.** Type in any field, pick a preset, or hit `CLEAR`, and tracking switches off. Tap `◉ TRACK` to resume.
- **Edit any format.** All nine fields are inputs; editing one parses and re-renders the other eight.
- **One-click copy.** Each row has a compact icon-only copy button on the right; clicking it (or Tab + Enter) copies that field's value and briefly flashes green. Clicking the label on the left focuses the input for editing.
- **Forgiving parsers.** Accepts pasted forms with or without degree/minute/second symbols, with or without spaces in MGRS, `lat,lon` or `lat lon`, hemisphere letters or signed numbers, UTM with band letter (`10T`), hemisphere letter (`10N`), or unit suffixes (`550200mE`).
- **Precision.** DD to 6 dp (~11 cm); DDM/DMS to sub-second; UTM/MGRS to 1 m; ECEF to 1 cm; Plus Code 10-digit (~14 m); Geohash 10-char (~60 cm).

## Supported formats

Ordered by coordinate system type: geographic (lat/lon) → projected grid → 3D cartesian → URI → compact codes.

| Label | Format                    | Example                                         |
| ----- | ------------------------- | ----------------------------------------------- |
| DD    | Decimal degrees           | `47.6062, -122.3321`                            |
| DDM   | Degrees + decimal minutes | `47° 36.372' N, 122° 19.926' W`                 |
| DMS   | Degrees / minutes / seconds | `47° 36' 22.32" N, 122° 19' 55.56" W`         |
| UTM   | Universal Transverse Mercator | `10T 550200 5273800`                        |
| MGRS  | Military Grid Ref         | `10T ET 50200 73800`                            |
| ECEF  | Earth-Centered Earth-Fixed (m) | `-2291628.00, -3637094.00, 4670080.00`     |
| GEO   | `geo:` URI (RFC 5870)     | `geo:47.6062,-122.3321`                         |
| PLUS  | Plus Code (Open Location Code) | `84VVJM49+F5`                              |
| HASH  | Geohash (base-32)         | `c23nb62w2`                                     |

## Running it

Open `coords.html` directly in a browser, but geolocation **requires a secure context**:

- `https://…` — works everywhere.
- `http://localhost` / `http://127.0.0.1` — works (treated as secure).
- `file://` — works in Chrome, blocked in Safari.

Easiest ways to get HTTPS locally:

```sh
# Python, localhost only (works for geolocation)
python3 -m http.server 8000

# Or serve over Tailscale/Caddy/ngrok to hit it from an iPhone
caddy file-server --listen :8443 --domain your.tailnet.ts.net
```

Then load `http://localhost:8000/coords.html` or the HTTPS URL.

## Tracking UX

| State                     | Button text      | What's happening                                    |
| ------------------------- | ---------------- | --------------------------------------------------- |
| On load (secure context)  | `◉ TRACKING` (pulsing amber) | `watchPosition` active, fields update per fix |
| User typed / preset / clear | `◉ TRACK`      | Manual mode — tap to resume                         |
| Permission denied         | `◉ TRACK`       | Tracking stopped; status tells you where to re-enable |
| Insecure context          | `◉ TRACK`       | Manual mode; status explains how to get HTTPS       |

## Limitations

- **UTM/MGRS** valid 80°S to 84°N. UPS (polar) not implemented.
- **Zone irregularities** — Norway (32V) and Svalbard (31X–37X) exceptions are not handled. Rare in practice.
- **MGRS row-band resolution** uses a single-cycle nearest-match against the band's central latitude; correct within normal latitude ranges.
- **Plus Codes** — full 10-digit global codes only; no short-code resolution (no reference location to disambiguate).
- **ECEF** — altitude is always rendered as 0. A typed ECEF value with non-zero altitude parses correctly, but other formats only show the surface projection; on re-display ECEF is rewritten with h=0.

## Tests

A small Node suite (`test.js`) extracts the `<script>` block from `coords.html`, stubs the browser globals, and runs round-trip + parser-flexibility + known-value assertions against every format. The tests always target the live code — no stale copy to drift from.

```sh
node --test test.js      # or: npm test
```

Covers:

- **Round-trip** — for each format, `format(parse(x))` recovers `x` within per-format tolerance. Ten reference points including equator, southern hemisphere, Svalbard-adjacent latitudes, and UTM zone boundaries.
- **Cross-format equivalence** — starting from the same lat/lon, all nine recovered points agree within the coarsest format's cell (Plus Code's 14 m).
- **Known reference values** — Seattle UTM zone 10T, Sydney 56H, Torres del Paine 18F, Null Island ECEF ≈ (a, 0, 0), Seattle Plus Code `84VV…`, etc.
- **Parser flexibility** — DD comma vs. space, DDM/DMS with degree/minute/second symbols, UTM with band letter vs. hemisphere letter vs. `mE`/`mN` unit suffix, MGRS with/without spaces, Plus Code with/without `+`, case-insensitive Geohash, `geo:` URI with altitude and `;params`.
- **Error cases** — invalid zones, out-of-range coordinates, malformed Plus Codes, non-Earth ECEF, bad Geohash characters.

Requires Node 18+ for the built-in test runner.

## Files

- `coords.html` — the app (HTML + inline CSS + inline JS).
- `index.html` — redirects to `coords.html` so the bare GitHub Pages URL works.
- `test.js` — round-trip and flexibility tests against `coords.html`.
- `package.json` — exposes `npm test`.
- `.gitignore` — excludes `.claude/settings.local.json`.
