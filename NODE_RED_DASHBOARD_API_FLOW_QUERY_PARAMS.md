# Node-RED Dashboard API (Query Parameters) – Import & Usage

هذا الفلو جاهز ليكون **Backend API** للـ Frontend Dashboard عندك، ويشتغل بالكامل باستخدام **Query Parameters** (`msg.req.query`).

## ✅ الملف الجاهز للاستيراد

- الفلو موجود هنا:
  - `node-red-dashboard-api-flow-query-params.json`

## 🧩 كيف تعمل Import على Node‑RED

1. افتح Node‑RED.
2. من القائمة (☰) → **Import**.
3. افتح ملف `node-red-dashboard-api-flow-query-params.json` وانسخه بالكامل، أو افتحه كمصدر.
4. اعمل Import.
5. عدّل إعدادات MySQL من الـ config nodes:
   - `ocpp_CSGO (edit me)`
   - `ion (edit me)`
6. Deploy.

## 🔌 Endpoints (مطابقة للفرونت)

### Sessions Tables
- `GET /api/dashboard/active-sessions?from=2025-10-01&limit=6`
- `GET /api/dashboard/local-sessions?from=2025-10-01&limit=6`

### Glance + TrayIcons
- `GET /api/dashboard/stats`
  - يرجع object فيه:
    - `activeSessions`, `utilization`, `chargersOnline`
    - `newUsers`, `sessions`
    - `eFawateerCom`, `ni`, `orangeMoney`, `totalCashIn`, `expendature`
  - باقي الحقول (`payments`, `faults`, `revenue`, `tariffAC`, `tariffDC`) موجودة لكن حالياً 0 (لأنها تعتمد على جداول/منطق إضافي عندك).

### LocationControl (Selectors)
- `GET /api/chargers/organizations`
- `GET /api/locations?organizationId=ORG_ID` (يدعم كمان `organization_id`)
- `GET /api/chargers?locationId=LOC_ID` (يدعم كمان `location_id`)
- `GET /api/connectors?chargerId=CHARGER_ID` (يدعم كمان `charger_id`)

### Status
- `GET /api/dashboard/charger-status?chargerId=CHARGER_ID`
- `GET /api/dashboard/connector-status?connectorId=CONNECTOR_ID`

### Commands
- `POST /api/dashboard/charger-command?chargerId=CHARGER_ID&command=restart`
  - commands: `restart | stop | unlock`
  - كمان يقبل body JSON لو بدك: `{ "chargerId": "...", "command": "restart" }`

### User Info
- `GET /api/dashboard/user-info?mobile=+9627XXXXXXX`
- `GET /api/dashboard/user-sessions?mobile=+9627XXXXXXX`
- `GET /api/dashboard/user-payments?mobile=+9627XXXXXXX`

## ملاحظة مهمة عن CORS

الفلو يضيف headers CORS داخل node اسمه:
- `HTTP: send JSON (common)`

إذا عندك Reverse Proxy (NGINX) أو إعدادات مختلفة، ممكن تحتاج تعدّلها هناك بدل Node‑RED.

