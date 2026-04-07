# Node-RED: Partner Bill sessions report API

This document describes the HTTP contract implemented by the front-end at:

- `GET /api/v4/reports/sessions-report`
- `GET /api/v4/reports/sessions-report/export` (CSV, UTF-8 BOM)

Prefix `/api` is the Vite dev proxy; production uses your public API base URL.

## Query parameters (list endpoint)

| Param | Required | Notes |
|-------|----------|--------|
| `fromDate` | yes | `YYYY-MM-DD` |
| `fromHour` | yes | `00`–`23` |
| `fromMinute` | yes | `00`–`59` |
| `toDate` | yes | `YYYY-MM-DD` |
| `toHour` | yes | `00`–`23` |
| `toMinute` | yes | `00`–`59` |
| `locationIds` | no | Comma-separated |
| `chargerIds` | no | Comma-separated |
| `connectorIds` | no | Comma-separated |
| `energyMin` | no | Number |
| `energyMax` | no | Number |
| `dateOrder` | no | `asc` or `desc` (default `desc`) |
| `page` | no | Default `1` |
| `perPage` | no | Default `20` |

Compose SQL/datetime bounds as:

- `from = "${fromDate} ${fromHour}:${fromMinute}:00"`
- `to   = "${toDate} ${toHour}:${toMinute}:59"`

Validate: `from <= to`; if `energyMin` / `energyMax` invalid or `energyMin > energyMax`, return **400** with a JSON `message`.

## JSON response

```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "perPage": 20,
  "data": [
    {
      "StartDateTime": "2026-01-04 08:00:00",
      "SessionID": "…",
      "Location": "…",
      "Charger": "…",
      "Connector": "…",
      "EnergyKWH": 12.5,
      "AmountJOD": 3.75,
      "Mobile": "…"
    }
  ]
}
```

`count` = rows in `data` for this page; `total` = full result count before `LIMIT/OFFSET`.

## SQL reference (MySQL)

Base table: `ocpp_CSGO.Partner_Bill` AS `PB`

Joins:

- `ocpp_CSGO.Chargers` AS `C` ON `PB.charger_id = C.charger_id`
- `ocpp_CSGO.Connectors` AS `Co` ON `PB.connector_id = Co.connector_id AND PB.charger_id = Co.charger_id`
- `ocpp_CSGO.Locations` AS `L` ON `C.location_id = L.location_id`

Base filters:

- `PB.issue_date >= ?` (from)
- `PB.issue_date <= ?` (to)
- `PB.total_amount > 0`

Optional filters (only when query params present):

- `L.location_id IN (…)` from `locationIds`
- `C.charger_id IN (…)` from `chargerIds`
- `Co.connector_id IN (…)` or appropriate id column from `connectorIds`
- `PB.total_kwh >= ?` / `<= ?` for energy min/max

Select:

- `PB.issue_date AS StartDateTime`
- `PB.session_id AS SessionID`
- `L.name AS Location`
- `C.charger_id AS Charger`
- `Co.connector_type AS Connector`
- `ROUND(PB.total_kwh, 2) AS EnergyKWH`
- `ROUND(PB.total_amount, 2) AS AmountJOD`
- `PB.issued_to AS Mobile`

Order:

- `ORDER BY PB.issue_date {ASC|DESC}, PB.session_id {ASC|DESC}`

Pagination:

- `LIMIT perPage OFFSET (page - 1) * perPage`

## CSV export

Same filters as the list endpoint (omit `page` / `perPage`).

- Body: CSV with UTF-8 **BOM** (`\uFEFF`…)
- Header: `Content-Disposition: attachment; filename="sessions-report-YYYY-MM-DD.csv"`
- Columns (header row): same labels as the UI table

## Cascading list endpoints (optional)

The UI also calls:

- `GET /v4/locations` or `GET /v4/location`
- `GET /v4/charger?locationIds=a,b` or per-location merge
- `GET /v4/connector?chargerIds=a,b` or per-charger merge

Implement these if not already present so filters populate.
