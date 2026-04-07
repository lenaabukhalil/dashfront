# Charger Comparison و Connector Comparison — مرجع تفصيلي

هذا المستند يشرح **Charger Comparison** و **Connector Comparison** كما هي مبنية في الداشبورد الحالي، لتمكين تنفيذها على ويبسايت آخر بنفس الشكل والسلوك.

---

## 1) الغرض من الصفحتين

- **Charger Comparison:** مقارنة **شواحن** (chargers) حسب جلسات الشحن والإيرادات والطاقة في فترة زمنية. يدعم:
  - **قائمة/جدول:** عرض عدة شواحن مع فلترة (منظمة، موقع، نطاق تاريخ، اختيار شواحن محددة).
  - **مقارنة رأسية (A vs B):** اختيار شاحنين وفترتين زمنيتين ومقارنة أدائهما (جلسات، kWh، مبلغ JOD، ومن يُعتبر "الأفضل").
- **Connector Comparison:** نفس الفكرة لكن على مستوى **الكونكتورات** (connectors) بدل الشواحن. كل كونكتور مرتبط بشاحن؛ البيانات المجمعة (جلسات، kWh، مبلغ) تُحسب لكل كونكتور.

مصدر البيانات في الباكند: جداول الجلسات/الفواتير (مثل **Partner_Bill** أو ما يعادلها) مع ربط بـ **Chargers**, **Connectors**, **Locations**.

---

## 2) الـ API (Backend)

الـ Backend المستخدم في هذا المشروع هو **Node-RED** (Dashboard API) مع قاعدة **ocpp_CSGO**. الـ endpoints التالية يجب أن تكون متوفرة بنفس العقد (أو ما يعادلها في ويبسايتك).

### 2.1) Endpoints عامة (للـ dropdowns)

| الغرض | Method | URL (نموذج) | ملاحظات |
|--------|--------|-------------|----------|
| قائمة المنظمات | GET | `/api/v4/org` | للاختيار في "Organization". الاستجابة: `{ success, data }` أو مصفوفة؛ كل عنصر فيه `id`, `name` (أو ما يكافئ). |
| مواقع منظمة | GET | `/api/v4/location?organizationId={id}` | بعد اختيار المنظمة. الاستجابة مصفوفة عناصر فيها `location_id` و `name` (أو `id`/`name`). |
| شواحن موقع | GET | `/api/v4/charger?locationId={id}` | بعد اختيار الموقع. الاستجابة مصفوفة عناصر فيها `id` و `name` (أو `charger_id`/اسم). |
| كونكتورات شاحن | GET | `/api/v4/connector?chargerId={id}` | بعد اختيار الشاحن (لصفحة Connector Comparison). الاستجابة مصفوفة عناصر فيها `id` و `type` (أو `connector_id`/`connector_type`). |

الفرونت يحوّل هذه المصفوفات إلى خيارات للقوائم: `{ value: id, label: name }`.

### 2.2) Charger Comparison — GET

| البند | القيمة |
|--------|--------|
| **URL** | `GET /api/v4/dashboard/charger-comparison` |
| **Query params** | كلها اختيارية. تُحدّد نطاق التاريخ والفلترة: |
| | `start` — تاريخ بداية (YYYY-MM-DD). |
| | `end` — تاريخ نهاية (YYYY-MM-DD). |
| | `locationId` — فلترة حسب موقع واحد. |
| | `chargerIds` — قائمة معرّفات شواحن، مرسلة كـ **سلسلة مفصولة بفاصلة**، مثلاً `chargerIds=1,2,3`. |
| **استجابة ناجحة** | `200` مع body مثل: `{ success: true, count: N, data: [ ... ] }`. |
| **لا بيانات** | `204 No Content` أو `data: []`. |

**شكل كل عنصر في `data` (ChargerComparisonRow):**

| الحقل | النوع | الوصف |
|--------|--------|--------|
| `chargerId` | string \| number | معرّف الشاحن. |
| `name` | string | اسم الشاحن. |
| `type` | string (اختياري) | نوع الشاحن (مثلاً AC/DC). |
| `status` | string | الحالة (مثلاً online / offline). |
| `locationId` | string \| number | معرّف الموقع. |
| `locationName` | string (اختياري) | اسم الموقع. |
| `connectorsCount` | number | عدد الكونكتورات التابعة للشاحن. |
| `onlineFlag` | boolean | هل الشاحن online. |
| `lastUpdate` | string \| null (اختياري) | آخر تحديث (إن وُجد). |
| `sessionsCount` | number (اختياري) | عدد الجلسات في الفترة. |
| `totalKwh` | number (اختياري) | إجمالي kWh. |
| `totalAmount` | number (اختياري) | إجمالي المبلغ (مثلاً JOD). |

الـ Backend يبني هذه القيم من جداول مثل **Chargers**, **Connectors**, **Locations**, و**Partner_Bill** (أو جدول جلسات/فواتير) مع **SUM(total_kwh)**, **SUM(total_amount)**, **COUNT(session_id)** ضمن الفترة `[start, end)` ومفلتراً حسب `location_id` و/أو `charger_id IN (...)`.

### 2.3) Connector Comparison — GET

| البند | القيمة |
|--------|--------|
| **URL** | `GET /api/v4/dashboard/connector-comparison` |
| **Query params** | كلها اختيارية: |
| | `start`, `end` — نفس المعنى (YYYY-MM-DD). |
| | `locationId` — فلترة حسب موقع. |
| | `chargerId` — فلترة حسب شاحن واحد. |
| | `connectorIds` — قائمة معرّفات كونكتورات، مرسلة كـ **سلسلة مفصولة بفاصلة**، مثلاً `connectorIds=1,2,3`. |
| **استجابة ناجحة** | `200` مع `{ success: true, count: N, data: [ ... ] }`. |
| **لا بيانات** | `204` أو `data: []`. |

**شكل كل عنصر في `data` (ConnectorComparisonRow):**

| الحقل | النوع | الوصف |
|--------|--------|--------|
| `connectorId` | string \| number | معرّف الكونكتور. |
| `chargerId` | string \| number | معرّف الشاحن. |
| `chargerName` | string (اختياري) | اسم الشاحن. |
| `connectorType` | string (اختياري) | نوع الكونكتور. |
| `status` | string | الحالة. |
| `locationName` | string (اختياري) | اسم الموقع. |
| `sessionsCount` | number (اختياري) | عدد الجلسات. |
| `totalKwh` | number (اختياري) | إجمالي kWh. |
| `totalAmount` | number (اختياري) | إجمالي المبلغ. |
| `avgSessionKwh` | number (اختياري) | متوسط kWh لكل جلسة. |
| `avgSessionAmount` | number (اختياري) | متوسط المبلغ لكل جلسة. |
| `avgSessionMinutes` | number (اختياري) | متوسط مدة الجلسة بالدقائق. |

إذا الـ Backend لا يرجع الحقول الاختيارية (مثل `avgSessionKwh`)، الفرونت يحسبها من `totalKwh/sessionsCount` و `totalAmount/sessionsCount` عند العرض.

---

## 3) واجهة المستخدم (نفس الشكل الموجود)

### 3.1) Charger Comparison — هيكل الصفحة

1. **عنوان ووصف**
   - عنوان: "Charger Comparison".
   - وصف: اختيار شاحنين وفترتين زمنيتين ومقارنة الأداء (استغلال، إيراد، طاقة).

2. **قسم "مقارنة رأسية A vs B"**
   - **جانب A (Charger A):**
     - قائمة منسدلة: Organization → Location → Charger.
     - حقلان تاريخ: Start date, End date.
   - **جانب B (Charger B):**
     - نفس الحقول (Organization, Location, Charger, Start, End). يمكن أن تكون منظمة/موقع/فترة مختلفة.
   - زر: **"Compare A vs B"** — يرسل طلبين متوازيين:
     - `GET charger-comparison?start=startA&end=endA&chargerIds=chargerA`
     - `GET charger-comparison?start=startB&end=endB&chargerIds=chargerB`
   - بعد الاستجابة:
     - عرض **بطاقتين** (Card) جنباً إلى جنب: Charger A و Charger B.
     - في كل بطاقة: الاسم، النوع، الحالة (Online/Offline)، ثم أقسام:
       - **Utilization:** Total Sessions, Sessions/day.
       - **Revenue:** Total (JOD), Per day.
       - **Energy:** Total (kWh), Per session (kWh).
     - إظهار "Charger A — Best performer" أو "Charger B — Best performer" حسب **نقاط** محسوبة من (sessions/day, amount/day, kwh/day, kwh/session) بشكل نسبي بين A و B.
     - تحذير إذا نوع الشاحن مختلف (مثلاً AC vs DC).

3. **حساب "الأفضل" (Head-to-head)**
   - من الأيام في كل فترة: `days = (end - start) / (24*60*60*1000) + 1` (تقريباً).
   - مقاييس لكل جانب: sessions/day, amount/day, kwh/day, kwh/session (واختياري amount/session).
   - تطبيع: كل مقياس يُقسّم على الـ max بين A و B فيصبح بين 0 و 1.
   - **Score** لكل جانب = متوسط هذه القيم × 100 (مثلاً 0–100).
   - الجانب الذي له الـ score أعلى هو "Best performer".

4. **جدول/قائمة (إن وُجد في تصميمك)**
   - فلتر: Organization → Location، وتاريخ start/end، واختيار شواحن (checkboxes أو multi-select).
   - طلب واحد: `GET charger-comparison?start=...&end=...&locationId=...&chargerIds=id1,id2,...`.
   - جدول أعمدة: Charger ID, Name, Type, Status, Location, Connectors, Online, Sessions, Total kWh, Total Amount.
   - إمكانية ترتيب (sort) وتصدير CSV.

### 3.2) Connector Comparison — هيكل الصفحة

1. **عنوان ووصف**
   - عنوان: "Connector Comparison".
   - وصف: مقارنة كونكتورين باستخدام مجاميع الجلسات (جلسات، إجمالي kWh، إجمالي JOD، متوسط لكل جلسة، متوسط المدة).

2. **قسم A vs B**
   - **Connector A:** Organization → Location → Charger → **Connector**، ثم Start date, End date.
   - **Connector B:** نفس التسلسل. خيار "Same date range for both" يربط تاريخ B بتاريخ A.
   - زر **"Compare A vs B"** يرسل:
     - `GET connector-comparison?start=...&end=...&chargerId=chargerA&connectorIds=connectorA`
     - `GET connector-comparison?start=...&end=...&chargerId=chargerB&connectorIds=connectorB`
   - عرض بطاقتين: Connector A و Connector B مع:
     - Utilization (Total Sessions, Sessions/day),
     - Revenue (Total JOD, Per day),
     - Energy (Total kWh, Avg/session kWh),
     - Session (Avg/session JOD, Avg duration min إن وُجد).
   - "Connector A/B — Best performer" بنفس منطق الـ score المستخدم في Charger Comparison.
   - تحذير إذا نوع الكونكتور مختلف.

3. **جدول (إن وُجد)**
   - فلتر: Organization → Location → Charger، وتاريخ، واختيار كونكتورات.
   - طلب: `GET connector-comparison?start=...&end=...&locationId=...&chargerId=...&connectorIds=...`.
   - أعمدة: Connector ID, Charger ID, Charger Name, Type, Status, Location, Sessions, Total kWh, Total Amount.

---

## 4) بناء الـ URL مع الـ query params (للويبسايت الثاني)

- **Charger comparison (قائمة):**
  - `GET /api/v4/dashboard/charger-comparison?start=2025-01-01&end=2025-12-31`
  - مع موقع: `&locationId=5`
  - مع شواحن محددة: `&chargerIds=10,11,12` (بدون مسافات بعد الفاصلة عادةً).
- **Charger comparison (A vs B):**
  - طلب A: `?start=2025-06-01&end=2025-06-30&chargerIds=10`
  - طلب B: `?start=2025-07-01&end=2025-07-31&chargerIds=11`
- **Connector comparison (A vs B):**
  - طلب A: `?start=2025-06-01&end=2025-06-30&chargerId=10&connectorIds=1`
  - طلب B: `?start=2025-06-01&end=2025-06-30&chargerId=11&connectorIds=2`

ملاحظة: في الكود الحالي استدعاءات `fetchChargerComparison` و `fetchConnectorComparison` تأخذ الـ params كمعامل لكن الـ URL يُبنى بدونها؛ في ويبسايتك الجديد يفضّل بناء الـ query string من الـ params وتمريرها في الـ GET.

---

## 5) الصلاحيات (إن وُجدت)

في هذا المشروع صفحة التقارير (Reports) والتبويبات Charger/Connector Comparison محمية بصلاحية مثل `finance.reports` عبر `usePermission` و `canRead?.("finance.reports")`. في ويبسايت آخر يمكن تطبيق نفس الفكرة أو استبدالها بنظام أدوارك.

---

## 6) ملخص سريع للتنفيذ على ويبسايت ثاني

| المطلوب | التفاصيل |
|---------|----------|
| **Backend** | توفير GET لـ `/charger-comparison` و `/connector-comparison` مع query params: start, end, locationId، و chargerIds أو chargerId+connectorIds. الاستجابة: `{ success, data }` مع مصفوفة الصفوف بالحقول أعلاه. |
| **Dropdowns** | GET org → location?organizationId= → charger?locationId= → (للمقارنة بالكونكتور) connector?chargerId=. تحويل الاستجابات إلى خيارات value/label. |
| **UI Charger** | قسمان A و B (org, location, charger, start, end)، زر Compare، ثم بطاقتان مع Utilization / Revenue / Energy و "Best performer" واختياري جدول مع تصدير CSV. |
| **UI Connector** | نفس الفكرة مع مستوى إضافي (connector) وزر "Same date range for both"، وعرض avg/session و avg duration إن وُجدت في الـ API. |
| **حساب Best performer** | تطبيع sessions/day, amount/day, kwh/day, kwh/session بين A و B، ثم متوسط النسب × 100 = score؛ الأعلى يفوز. |

بهذا الشكل يمكن تنفيذ Charger Comparison و Connector Comparison على ويبسايت آخر بنفس الشكل والسلوك المعتمد هنا.
