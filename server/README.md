# Geocode proxy (Photon)

## Why Photon

- **Nominatim** from the browser is unreliable: CORS, rate limits, and setting `User-Agent` in browser fetch can be blocked or cause “Failed to fetch”.
- **Photon** (Komoot) is used for autocomplete: it supports typeahead, location bias (`lat`/`lon`), and works well for partial queries (“Circle”, “شميساني”) and neighborhoods. It returns GeoJSON; we normalize to the same suggestion shape the frontend expects.

## Proxy and caching

- **Routes:** `GET /api/autocomplete`, `GET /api/geocode`. The server calls Photon with a proper `User-Agent`; the browser only calls our API with `Accept: application/json` (no custom headers).
- **Cache:** In-memory by `(query + params)`, TTL **10 minutes**, so repeated searches don’t hit Photon every time.
- **Rate limit:** **60 requests per minute per IP** to protect Photon and avoid abuse.

## Run

- Dev (API only): `npm run server` (port 3001).
- Dev (Vite + API): `npm run dev:all` (Vite proxies `/api` to the server).
- Production: run the same server and route `/api` to it (e.g. reverse proxy).
