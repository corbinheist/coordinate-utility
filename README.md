# COORDS

A single-file WGS84 coordinate converter. Opens in live GPS tracking mode and round-trips between DD, DDM, DMS, UTM, and MGRS.

No build, no dependencies — `coords.html` is the whole app.

## Features

- **Live tracking on load.** Uses `navigator.geolocation.watchPosition`, so the fields follow your position as you move. Each fix shows accuracy (`±Nm`) and timestamp.
- **Manual override, any time.** Type in any field, pick a preset, or hit `CLEAR`, and tracking switches off. Tap `◉ TRACK` to resume.
- **Edit any format.** All five fields are inputs; editing one parses and re-renders the other four.
- **Forgiving parsers.** Accepts pasted forms with or without degree/minute/second symbols, with or without spaces in MGRS, `lat,lon` or `lat lon`, hemisphere letters or signed numbers, UTM with band letter (`10T`), hemisphere letter (`10N`), or unit suffixes (`550200mE`).
- **Precision.** DD to 6 dp (~11 cm); DDM/DMS to sub-second; UTM/MGRS to 1 m, rounded consistently across both displays.

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

## Files

- `coords.html` — the app (HTML + inline CSS + inline JS).
- `.gitignore` — excludes `.claude/settings.local.json`.
