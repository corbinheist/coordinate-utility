# COORDS

A single-file WGS84 coordinate converter. Opens in live GPS tracking mode and round-trips between DD, DDM, DMS, UTM, MGRS, `geo:` URI, Plus Code, Geohash, and ECEF.

No build, no dependencies — `coords.html` is the whole app.

## Features

- **Live tracking on load.** Uses `navigator.geolocation.watchPosition`, so the fields follow your position as you move. Each fix shows accuracy (`±Nm`) and timestamp.
- **Manual override, any time.** Type in any field, pick a preset, or hit `CLEAR`, and tracking switches off. Tap `◉ TRACK` to resume.
- **Edit any format.** All nine fields are inputs; editing one parses and re-renders the other eight.
- **Click-to-copy labels.** Each coordinate label (`DD`, `DMS`, `MGRS`, …) is itself a copy button — click it (or Tab + Enter) to copy that field's value. A small transparent copy icon next to the label text marks it as actionable; it flashes green when the clipboard write succeeds.
- **Forgiving parsers.** Accepts pasted forms with or without degree/minute/second symbols, with or without spaces in MGRS, `lat,lon` or `lat lon`, hemisphere letters or signed numbers, UTM with band letter (`10T`), hemisphere letter (`10N`), or unit suffixes (`550200mE`).
- **Precision.** DD to 6 dp (~11 cm); DDM/DMS to sub-second; UTM/MGRS to 1 m; Geohash 10-char (~60 cm); Plus Code 10-digit (~14 m); ECEF to 1 cm.

## Supported formats

| Label | Format                    | Example                                         |
| ----- | ------------------------- | ----------------------------------------------- |
| DD    | Decimal degrees           | `47.6062, -122.3321`                            |
| DDM   | Degrees + decimal minutes | `47° 36.372' N, 122° 19.926' W`                 |
| DMS   | Degrees / minutes / seconds | `47° 36' 22.32" N, 122° 19' 55.56" W`         |
| UTM   | Universal Transverse Mercator | `10T 550200 5273800`                        |
| MGRS  | Military Grid Ref         | `10T ET 50200 73800`                            |
| GEO   | `geo:` URI (RFC 5870)     | `geo:47.6062,-122.3321`                         |
| PLUS  | Plus Code (Open Location Code) | `84VVJM49+F5`                              |
| HASH  | Geohash (base-32)         | `c23nb62w2`                                     |
| ECEF  | Earth-Centered Earth-Fixed (m) | `-2291628.00, -3637094.00, 4670080.00`     |

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

## Files

- `coords.html` — the app (HTML + inline CSS + inline JS).
- `index.html` — redirects to `coords.html` so the bare GitHub Pages URL works.
- `.gitignore` — excludes `.claude/settings.local.json`.
