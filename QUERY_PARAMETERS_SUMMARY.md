# ملخص قاعدة Query Parameters Only

## ⚠️ قاعدة إلزامية

**جميع الـ API endpoints يجب أن تستخدم Query Parameters فقط.**

## 📋 التعديلات المطلوبة في Node-RED Flow

### 1. Locations API - إزالة Path Parameters

#### ❌ يجب إزالة:
- Node "GET Locations by Organization" (id: 55618af9d9b39866)
- URL: `/api/v4/location/by-organization` ❌

#### ✅ يجب استخدام:
- GET `/api/v4/location?organizationId={id}` ✅
- دمج الوظيفة في Node "Query All Locations" الموجود

### 2. جميع Function Nodes - استخدام msg.req.query

#### ✅ الصحيح:
```javascript
const id = msg.req.query.id;
const organizationId = msg.req.query.organizationId;
const locationId = msg.req.query.locationId;
```

#### ❌ الخطأ:
```javascript
const id = msg.req.params.id;  // ❌ لا تستخدم
```

### 3. HTTP In Nodes - لا تستخدم Path Parameters

#### ✅ الصحيح:
```json
{
  "url": "/api/v4/location",
  "method": "get"
}
```

#### ❌ الخطأ:
```json
{
  "url": "/api/v4/location/:id",  // ❌ لا تستخدم
  "method": "get"
}
```

## 📝 قائمة Endpoints الصحيحة

### Organizations:
- ✅ `GET /api/v4/org`
- ✅ `GET /api/v4/org?id={id}`
- ✅ `POST /api/v4/org`
- ✅ `PUT /api/v4/org?id={id}`
- ✅ `DELETE /api/v4/org?id={id}`

### Locations:
- ✅ `GET /api/v4/location`
- ✅ `GET /api/v4/location?id={id}`
- ✅ `GET /api/v4/location?organizationId={id}`
- ✅ `POST /api/v4/location`
- ✅ `PUT /api/v4/location?id={id}`
- ✅ `DELETE /api/v4/location?id={id}`

### Chargers:
- ✅ `GET /api/v4/charger`
- ✅ `GET /api/v4/charger?id={id}`
- ✅ `GET /api/v4/charger?status={status}`
- ✅ `GET /api/v4/charger?locationId={id}`
- ✅ `GET /api/v4/charger?status={status}&locationId={id}`
- ✅ `POST /api/v4/charger`
- ✅ `PUT /api/v4/charger?id={id}`
- ✅ `DELETE /api/v4/charger?id={id}`

## 🔍 التحقق من التطبيق

### في Node-RED:
1. افتح جميع Function Nodes
2. ابحث عن `msg.req.params` ❌
3. استبدلها بـ `msg.req.query` ✅

### في HTTP In Nodes:
1. افتح جميع HTTP In Nodes
2. تأكد من عدم وجود `:id` أو أي path parameters في URL
3. جميع الـ IDs يجب أن تُمرر كـ query parameters

### في Documentation:
1. تأكد من أن جميع الأمثلة تستخدم query parameters
2. أزل أي إشارات لـ path parameters

## ✅ Checklist

- [ ] تم إزالة Node "GET Locations by Organization"
- [ ] تم دمج الوظيفة في GET /api/v4/location?organizationId={id}
- [ ] جميع Function Nodes تستخدم `msg.req.query`
- [ ] لا يوجد استخدام لـ `msg.req.params`
- [ ] جميع HTTP In Nodes لا تحتوي على path parameters
- [ ] جميع الأمثلة في Documentation تستخدم query parameters
- [ ] تم اختبار جميع Endpoints

---

**آخر تحديث**: 2024-01-19
