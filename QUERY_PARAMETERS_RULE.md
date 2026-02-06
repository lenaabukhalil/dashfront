# قاعدة Query Parameters - Query Parameters Only

## ⚠️ قاعدة مهمة جداً

**جميع الـ API endpoints يجب أن تستخدم Query Parameters فقط، وليس Path Parameters.**

## ✅ أمثلة صحيحة:

```
GET /api/v4/org?id=123
GET /api/v4/org?id=123&name=test
GET /api/v4/location?id=456
GET /api/v4/location?organizationId=789
GET /api/v4/location?organizationId=789&name=location1
GET /api/v4/charger?id=101
GET /api/v4/charger?status=online
GET /api/v4/charger?locationId=456
GET /api/v4/charger?status=online&locationId=456
PUT /api/v4/org?id=123
DELETE /api/v4/location?id=456
```

## ❌ أمثلة خاطئة (يجب تجنبها):

```
GET /api/v4/org/123                    ❌ Path parameter
GET /api/v4/location/456              ❌ Path parameter
GET /api/v4/location/by-organization/789  ❌ Path parameter
GET /api/v4/charger/101               ❌ Path parameter
PUT /api/v4/org/123                   ❌ Path parameter
DELETE /api/v4/location/456           ❌ Path parameter
```

## 📝 في Node-RED:

### ✅ الصحيح - استخدام Query Parameters:

```javascript
// في Function Node
const id = msg.req.query.id;                    // ✅ صحيح
const organizationId = msg.req.query.organizationId;  // ✅ صحيح
const status = msg.req.query.status;            // ✅ صحيح
const locationId = msg.req.query.locationId || msg.req.query.location_id;  // ✅ صحيح
```

### ❌ الخطأ - استخدام Path Parameters:

```javascript
// ❌ خطأ - لا تستخدم msg.req.params
const id = msg.req.params.id;                   // ❌ خطأ
const organizationId = msg.req.params.organizationId;  // ❌ خطأ
```

## 🔧 في HTTP In Node:

### ✅ الصحيح:

```json
{
  "type": "http in",
  "url": "/api/v4/location",      // ✅ بدون path parameters
  "method": "get"
}
```

### ❌ الخطأ:

```json
{
  "type": "http in",
  "url": "/api/v4/location/:id",  // ❌ لا تستخدم path parameters
  "method": "get"
}
```

## 📋 قائمة جميع Query Parameters المدعومة:

### Organizations API (`/api/v4/org`):
- `id` - Organization ID (GET, PUT, DELETE)

### Locations API (`/api/v4/location`):
- `id` - Location ID (GET, PUT, DELETE)
- `organizationId` - Filter by organization (GET)
- `organization_id` - Alternative name for organizationId (GET)

### Chargers API (`/api/v4/charger`):
- `id` - Charger ID (GET, PUT, DELETE)
- `status` - Filter by status: `online` or `offline` (GET)
- `locationId` - Filter by location (GET)
- `location_id` - Alternative name for locationId (GET)

## 🧪 أمثلة اختبار:

### باستخدام cURL:

```bash
# ✅ صحيح
curl "http://localhost:1880/api/v4/org?id=1"
curl "http://localhost:1880/api/v4/location?organizationId=5"
curl "http://localhost:1880/api/v4/charger?status=online&locationId=10"

# ❌ خطأ - لا تستخدم
curl "http://localhost:1880/api/v4/org/1"
curl "http://localhost:1880/api/v4/location/by-organization/5"
```

### باستخدام JavaScript/Fetch:

```javascript
// ✅ صحيح
fetch('/api/v4/org?id=1')
fetch('/api/v4/location?organizationId=5')
fetch('/api/v4/charger?status=online&locationId=10')

// ❌ خطأ - لا تستخدم
fetch('/api/v4/org/1')
fetch('/api/v4/location/by-organization/5')
```

## 🔍 التحقق من Query Parameters في Function Nodes:

```javascript
// مثال شامل للتحقق من جميع Query Parameters
const id = msg.req.query.id;
const organizationId = msg.req.query.organizationId || msg.req.query.organization_id;
const locationId = msg.req.query.locationId || msg.req.query.location_id;
const status = msg.req.query.status;

// Validation
if (id && isNaN(id)) {
    msg.statusCode = 400;
    msg.payload = {
        success: false,
        message: "Invalid id. Must be a number"
    };
    return null;
}

// Use in SQL query
if (id) {
    msg.topic = `SELECT * FROM table WHERE id = ?`;
    msg.payload = [Number(id)];
} else if (organizationId) {
    msg.topic = `SELECT * FROM table WHERE organization_id = ?`;
    msg.payload = [Number(organizationId)];
}
```

## ⚠️ ملاحظات مهمة:

1. **لا تستخدم Path Parameters أبداً** - حتى لو كان Node-RED يدعمها
2. **استخدم Query Parameters دائماً** - حتى للـ IDs
3. **في Node-RED**: استخدم `msg.req.query` وليس `msg.req.params`
4. **في HTTP In Node**: لا تستخدم `:id` أو أي path parameters في URL
5. **في Documentation**: تأكد من توثيق جميع Query Parameters بشكل صحيح

## 📚 أمثلة من الكود الحالي:

### ✅ مثال صحيح من Flow 1:

```javascript
// في Function Node "Query Organizations"
const orgId = msg.req.query.id;  // ✅ صحيح - query parameter

if (orgId === undefined) {
    // Get all
} else {
    // Get by ID
    msg.topic = `SELECT * FROM Organizations WHERE organization_id = ?`;
    msg.payload = [Number(orgId)];
}
```

### ✅ مثال صحيح من Locations API:

```javascript
// في Function Node "Query All Locations"
const locationId = msg.req.query.id;  // ✅ صحيح
const organizationId = msg.req.query.organizationId || msg.req.query.organization_id;  // ✅ صحيح

if (locationId !== undefined) {
    // Get by ID
} else if (organizationId !== undefined) {
    // Get by organization
} else {
    // Get all
}
```

---

**آخر تحديث**: 2024-01-19  
**الحالة**: قاعدة إلزامية - يجب اتباعها في جميع الـ Endpoints
