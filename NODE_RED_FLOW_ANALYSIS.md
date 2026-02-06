# تحليل Node-RED Flow والتعديلات المطلوبة

## 📋 ملخص المشاكل والتعديلات المطلوبة

### ✅ ما هو موجود ويعمل:
1. **GET /api/v4/org** - جلب جميع المنظمات ✓
2. **GET /api/v4/org?id={id}** - جلب تفاصيل منظمة ✓
3. **POST /api/v4/org** - إنشاء منظمة ✓
4. **PUT /api/v4/org?id={id}** - تحديث منظمة ✓
5. **DELETE /api/v4/org?id={id}** - حذف منظمة ✓
6. **GET /api/v4/charger** - جلب جميع الشواحن ✓
7. **GET /api/v4/charger?status={status}** - جلب الشواحن حسب الحالة ✓
8. **GET /api/v4/location** - جلب جميع المواقع ✓
9. **GET /api/v4/location?id={id}** - جلب تفاصيل موقع ✓

### ❌ المشاكل والتعديلات المطلوبة:

#### 1. مشكلة في Locations API - مسار مختلف
**المشكلة:**
- الـ Flow يستخدم `/api/v4/locations` (مع s)
- الـ Frontend يتوقع `/api/v4/location` (بدون s) أو `/locations`
- الـ Flow في tab "Locations API" يستخدم `/api/v4/locations` لكن يجب أن يكون `/api/v4/location`

**الحل:**
- تغيير URL في Locations API tab من `/api/v4/locations` إلى `/api/v4/location`

#### 2. Locations API - دعم query parameter للـ organizationId
**المشكلة:**
- الـ Frontend يحتاج `/api/v4/location?organizationId={id}` (query parameter فقط)
- الـ Flow الحالي لا يدعم query parameter للـ organizationId في GET /api/v4/location
- **مهم**: يجب استخدام query parameters فقط، وليس path parameters

**الحل:**
- إضافة دعم query parameter `organizationId` في function node "Query All Locations"
- قراءة من `msg.req.query.organizationId` وليس `msg.req.params`

#### 3. Locations API - DELETE endpoint مفقود
**المشكلة:**
- لا يوجد DELETE endpoint للـ locations
- الـ Frontend قد يحتاج حذف مواقع

**الحل:**
- إضافة DELETE endpoint `/api/v4/location?id={id}`

#### 4. Chargers API - دعم query parameter للـ locationId
**المشكلة:**
- الـ Frontend يحتاج `/api/v4/charger?locationId={id}`
- الـ Flow الحالي لا يدعم query parameter للـ locationId

**الحل:**
- إضافة دعم query parameter `locationId` في function node "Query Chargers Status"

#### 5. Chargers API - استخدام جدول خاطئ
**المشكلة:**
- Chargers API في tab "Chargers API" تستخدم جدول `chargers`
- يجب استخدام `ocpp_CSGO.Chargers` مثل باقي الـ flows

**الحل:**
- تغيير اسم الجدول في جميع SQL queries من `chargers` إلى `ocpp_CSGO.Chargers`

#### 6. Chargers API - POST/PUT/DELETE تحتاج تحسين
**المشكلة:**
- POST/PUT/DELETE في Chargers API tab تستخدم جدول `chargers` بدلاً من `ocpp_CSGO.Chargers`
- الحقول المطلوبة قد لا تتطابق مع ما يرسله الـ Frontend

**الحل:**
- تحديث SQL queries لاستخدام الجدول الصحيح
- إضافة جميع الحقول المطلوبة (location_id, max_session_time, num_connectors, description)

#### 7. Organizations API - Frontend يستخدم مسارات مختلفة
**المشكلة:**
- الـ Frontend يستخدم `/organizations` (POST, PUT, DELETE)
- الـ Flow يستخدم `/api/v4/org`
- **مهم**: جميع الـ IDs يجب أن تُمرر كـ query parameters وليس path parameters

**الحل:**
- إما تحديث الـ Frontend لاستخدام `/api/v4/org?id={id}` (query parameter)
- أو إضافة endpoints جديدة على `/organizations?id={id}` للتوافق مع الـ Frontend

#### 8. Locations API - Frontend يستخدم مسارات مختلفة
**المشكلة:**
- الـ Frontend يستخدم `/locations` أو `/locations/{id}` (POST, PUT)
- الـ Flow يستخدم `/api/v4/location`
- **مهم**: يجب تحديث Frontend لاستخدام query parameters: `/api/v4/location?id={id}`

**الحل:**
- تحديث الـ Frontend لاستخدام `/api/v4/location?id={id}` (query parameter)
- أو إضافة endpoints جديدة على `/locations?id={id}` للتوافق مع الـ Frontend

---

## 🔧 التعديلات المطلوبة بالتفصيل

### 1. تعديل Locations API Tab

#### أ. تغيير URL من `/api/v4/locations` إلى `/api/v4/location`

**Node: "GET Location by ID" (id: 9859123b064ef147)**
```json
{
  "url": "/api/v4/location",  // تغيير من /api/v4/locations
  "method": "get"
}
```

**ملاحظة مهمة**: يجب دمج endpoint "by-organization" في GET /api/v4/location باستخدام query parameter:
- `/api/v4/location?organizationId={id}` بدلاً من `/api/v4/location/by-organization`
- إزالة Node "Query Locations by Organization" واستخدام Node "Query All Locations" بدلاً منه

**Node: "POST /api/v4/locations" (id: 3ef510278d19a96f)**
```json
{
  "url": "/api/v4/location",  // تغيير من /api/v4/locations
  "method": "post"
}
```

**Node: "PUT /api/v4/locations" (id: f5174843e1eba3b8)**
```json
{
  "url": "/api/v4/location",  // تغيير من /api/v4/locations
  "method": "put"
}
```

#### ب. إضافة دعم organizationId في GET /api/v4/location

**تعديل Function Node: "Query All Locations" (id: 82c748dfc7223903)**
```javascript
const locationId = msg.req?.query?.id;
const organizationId = msg.req?.query?.organizationId || msg.req?.query?.organization_id;

if (locationId === undefined && organizationId === undefined) {
    // Get all locations
    msg.topic = `
        SELECT 
            location_id,
            name,
            name_ar,
            organization_id,
            lat,
            lng,
            num_chargers,
            payment_types,
            availability,
            visible_on_map
        FROM ocpp_CSGO.Locations
        ORDER BY name;
    `;
    msg.payload = [];
    return msg;
}

if (locationId !== undefined) {
    // Get location by ID
    msg.topic = `
    SELECT 
        location_id,
        organization_id,
        name,
        name_ar,
        lat,
        lng,
        num_chargers,
        description,
        logo_url,
        ad_url,
        payment_types,
        availability,
        subscription,
        visible_on_map,
        ocpi_id,
        ocpi_name,
        ocpi_address,
        ocpi_city,
        ocpi_postal_code,
        ocpi_country,
        ocpi_visible,
        ocpi_facility,
        ocpi_parking_restrictions,
        ocpi_directions,
        ocpi_directions_en
    FROM ocpp_CSGO.Locations
    WHERE location_id = ?;
    `;
    msg.payload = [locationId];
    return msg;
}

// Get locations by organization
if (organizationId !== undefined) {
    msg.topic = `
    SELECT 
        location_id,
        name,
        name_ar,
        organization_id,
        lat,
        lng,
        num_chargers,
        payment_types,
        availability,
        visible_on_map
    FROM ocpp_CSGO.Locations
    WHERE organization_id = ?
    ORDER BY name;
    `;
    msg.payload = [organizationId];
    return msg;
}
```

#### ج. إضافة DELETE endpoint للـ Locations

**إضافة Node جديد:**
```json
{
  "id": "new_delete_location_node",
  "type": "http in",
  "z": "84dc8a79659a361a",
  "name": "DELETE /api/v4/location",
  "url": "/api/v4/location",
  "method": "delete",
  "upload": false,
  "skipBodyParsing": false,
  "swaggerDoc": "",
  "x": 620,
  "y": 720,
  "wires": [["new_delete_location_function"]]
}
```

**إضافة Function Node:**
```json
{
  "id": "new_delete_location_function",
  "type": "function",
  "z": "84dc8a79659a361a",
  "name": "Delete Location",
  "func": "const id = msg.req?.query?.id;\nif (!id) { \n    msg.statusCode = 400; \n    msg.payload = {success: false, error: 'Location ID is required'}; \n    return msg; \n}\n\n// Check if location has chargers\nmsg.topic = `SELECT COUNT(*) as count FROM ocpp_CSGO.Chargers WHERE location_id = ?;`;\nmsg.payload = [id];\nmsg.checkChargers = true;\nreturn msg;",
  "outputs": 1,
  "x": 910,
  "y": 720,
  "wires": [["f71f5cc102196ff4"]]
}
```

**إضافة Function Node للتحقق من الشواحن:**
```json
{
  "id": "new_delete_location_check",
  "type": "function",
  "z": "84dc8a79659a361a",
  "name": "Check and Delete Location",
  "func": "const id = msg.req?.query?.id;\n\nif (msg.checkChargers) {\n    const count = msg.payload && msg.payload[0] ? msg.payload[0].count : 0;\n    \n    if (count > 0) {\n        msg.statusCode = 400;\n        msg.payload = {\n            success: false,\n            message: `Cannot delete location. It has ${count} charger(s) associated with it.`\n        };\n        return msg;\n    }\n    \n    // Proceed with deletion\n    msg.topic = `DELETE FROM ocpp_CSGO.Locations WHERE location_id = ?;`;\n    msg.payload = [id];\n    msg.checkChargers = false;\n    \n    // Send back to MySQL node\n    node.send(msg);\n    return null;\n}\n\n// Deletion successful\nmsg.payload = {\n    success: true,\n    message: \"Location deleted successfully\"\n};\nreturn msg;",
  "outputs": 1,
  "x": 1410,
  "y": 720,
  "wires": [["f534c421920cfe5b"]]
}
```

### 2. تعديل Chargers API Tab

#### أ. إضافة دعم locationId في GET /api/v4/charger

**تعديل Function Node: "Query Chargers Status" (id: 0713edffda09ca7b)**
```javascript
const status = msg.req.query.status;
const locationId = msg.req.query.locationId || msg.req.query.location_id;

const allowedStatus = ["online", "offline"];

let whereClause = "";
const conditions = [];

if (status) {
    if (!allowedStatus.includes(status)) {
        msg.statusCode = 400;
        msg.payload = {
            success: false,
            message: "Invalid status value. Allowed: online, offline"
        };
        return null; 
    }
    conditions.push(`c.status = '${status}'`);
}

if (locationId) {
    conditions.push(`c.location_id = '${locationId}'`);
}

if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
}

msg.topic = `
SELECT 
    c.charger_id AS id,
    c.name AS name,
    c.chargerID AS chargerID,
    c.ocpi_last_update AS time,
    c.status AS status,
    c.type AS type,
    c.location_id AS locationId
FROM ocpp_CSGO.Chargers c
${whereClause}
ORDER BY c.ocpi_last_update DESC;
`;

msg.payload = [];
return msg;
```

#### ب. تحديث Chargers API لاستخدام الجدول الصحيح

**تعديل جميع Function Nodes في Chargers API tab:**

**Node: "SQL Get By ID" (id: c7968fbe60a210bc)**
```javascript
msg.topic = `SELECT * FROM ocpp_CSGO.Chargers WHERE charger_id = ?`;
msg.payload = [msg.charger_id];
return msg;
```

**Node: "SQL Insert Charger" (id: a3a96d2eae70ceac)**
```javascript
const d = msg.data;
msg.topic = `
INSERT INTO ocpp_CSGO.Chargers (
    name, 
    type, 
    status, 
    location_id,
    max_session_time,
    num_connectors,
    description
) VALUES (?, ?, ?, ?, ?, ?, ?)
`;
msg.payload = [
    d.name, 
    d.type, 
    d.status,
    d.location_id || d.locationId || null,
    d.max_session_time || d.maxSessionTime || null,
    d.num_connectors || d.numConnectors || null,
    d.description || null
];
return msg;
```

**Node: "SQL Update Charger" (id: fd0d4752d512d29d)**
```javascript
const d = msg.data;
msg.topic = `
UPDATE ocpp_CSGO.Chargers 
SET 
    name = ?, 
    type = ?, 
    status = ?,
    location_id = ?,
    max_session_time = ?,
    num_connectors = ?,
    description = ?
WHERE charger_id = ?
`;
msg.payload = [
    d.name, 
    d.type, 
    d.status,
    d.location_id || d.locationId || null,
    d.max_session_time || d.maxSessionTime || null,
    d.num_connectors || d.numConnectors || null,
    d.description || null,
    d.charger_id
];
return msg;
```

**Node: "SQL Delete" (id: 3bceb64e9b1ebd58)**
```javascript
const id = msg.req.query.id;
if (!id || isNaN(id)) {
  msg.statusCode = 400;
  msg.payload = { success: false, message: "Invalid charger id" };
  return msg;
}

// Check if charger has connectors
msg.topic = `SELECT COUNT(*) as count FROM ocpp_CSGO.Connectors WHERE charger_id = ?`;
msg.payload = [Number(id)];
msg.checkConnectors = true;
return msg;
```

**إضافة Function Node للتحقق من Connectors:**
```json
{
  "id": "new_delete_charger_check",
  "type": "function",
  "z": "45796b2ac7520230",
  "name": "Check and Delete Charger",
  "func": "const id = msg.req?.query?.id;\n\nif (msg.checkConnectors) {\n    const count = msg.payload && msg.payload[0] ? msg.payload[0].count : 0;\n    \n    if (count > 0) {\n        msg.statusCode = 400;\n        msg.payload = {\n            success: false,\n            message: `Cannot delete charger. It has ${count} connector(s) associated with it.`\n        };\n        return msg;\n    }\n    \n    // Proceed with deletion\n    msg.topic = `DELETE FROM ocpp_CSGO.Chargers WHERE charger_id = ?`;\n    msg.payload = [Number(id)];\n    msg.checkConnectors = false;\n    \n    // Send back to MySQL node\n    node.send(msg);\n    return null;\n}\n\n// Deletion successful\nmsg.payload = {\n    success: true,\n    message: \"Charger deleted successfully\"\n};\nreturn msg;",
  "outputs": 1,
  "x": 1260,
  "y": 580,
  "wires": [["a17e895e94536abc"]]
}
```

#### ج. تحديث Validate Create/Update Functions

**Node: "Validate Create" (id: 9851bdf030c8ca59)**
```javascript
const d = msg.payload;
if (!d.name || !d.type || !d.status) {
  msg.statusCode = 400;
  msg.payload = { success: false, message: "Missing required fields: name, type, status" };
  return [null, msg];
}
msg.data = d;
return [msg, null];
```

**Node: "Validate Update" (id: d53fba2ad3bf8629)**
```javascript
const d = msg.payload;
if (!d.charger_id && !d.chargerId && !d.id) {
  msg.statusCode = 400;
  msg.payload = { success: false, message: "charger_id is required" };
  return [null, msg];
}

// Normalize charger_id
d.charger_id = d.charger_id || d.chargerId || d.id;

msg.data = d;
return [msg, null];
```

### 3. إضافة CORS Headers لجميع Responses

**تحديث جميع HTTP Response Nodes:**

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }
}
```

### 4. إضافة Error Handling محسّن

**تحديث Response Function Node في Flow 1 (id: ed2c8de64250cd0d):**
```javascript
//error
if (msg.error) {
    msg.statusCode = 500;
    msg.payload = {
        success: false,
        message: "Internal Server Error",
        source: msg.error.source?.name,
        details: msg.error.message
    };
    return msg;
}

//no data
if (!msg.payload || msg.payload.length === 0) {
    msg.statusCode = 204;
    msg.payload = [];
    return msg;
}

msg.statusCode = 200;
msg.payload = {
    success: true,
    count: msg.payload.length,
    data: msg.payload
};

return msg;
```

---

## 📝 ملخص التعديلات المطلوبة

### Locations API Tab:
1. ✅ تغيير جميع URLs من `/api/v4/locations` إلى `/api/v4/location`
2. ✅ إضافة دعم `organizationId` query parameter في GET
3. ✅ إضافة DELETE endpoint
4. ✅ إضافة التحقق من الشواحن قبل الحذف

### Chargers API Tab:
1. ✅ إضافة دعم `locationId` query parameter في GET
2. ✅ تغيير اسم الجدول من `chargers` إلى `ocpp_CSGO.Chargers`
3. ✅ إضافة جميع الحقول المطلوبة في INSERT/UPDATE
4. ✅ إضافة التحقق من Connectors قبل الحذف
5. ✅ تحسين validation functions

### Flow 1 (Organizations):
1. ✅ CORS headers موجودة ✓
2. ✅ Error handling موجود ✓

---

## 🚀 الخطوات التالية

1. **تطبيق التعديلات على Node-RED Flow**
2. **اختبار جميع Endpoints**
3. **التأكد من تطابق Response Format مع ما يتوقعه Frontend**
4. **إضافة Error Handling محسّن**
5. **إضافة Logging للـ Debugging**

---

## 📌 ملاحظات مهمة

1. **Database Schema**: تأكد من أن أسماء الجداول والأعمدة صحيحة:
   - `ocpp_CSGO.Organizations`
   - `ocpp_CSGO.Locations`
   - `ocpp_CSGO.Chargers`
   - `ocpp_CSGO.Connectors`

2. **Response Format**: جميع Responses يجب أن تتبع هذا الشكل:
   ```json
   {
     "success": true,
     "count": N,
     "data": [...]
   }
   ```

3. **Error Responses**: يجب أن تتبع هذا الشكل:
   ```json
   {
     "success": false,
     "message": "Error message"
   }
   ```

4. **CORS**: تأكد من إضافة CORS headers لجميع Responses

5. **SQL Injection**: استخدم Parameterized Queries دائماً (استخدم `?` و `msg.payload`)

6. **Query Parameters Only**: 
   - ✅ **صحيح**: `GET /api/v4/location?id=123`
   - ✅ **صحيح**: `GET /api/v4/location?organizationId=45`
   - ❌ **خطأ**: `GET /api/v4/location/123` (path parameter)
   - ❌ **خطأ**: `GET /api/v4/location/by-organization/45` (path parameter)
   - في Node-RED: استخدم `msg.req.query` وليس `msg.req.params`

---

**آخر تحديث**: 2024-01-19
