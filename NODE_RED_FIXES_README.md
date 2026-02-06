# دليل إصلاح Node-RED Flow

## ⚠️ قاعدة مهمة جداً: Query Parameters Only

**جميع الـ API endpoints يجب أن تستخدم Query Parameters فقط، وليس Path Parameters.**

- ✅ **صحيح**: `GET /api/v4/location?id=123`
- ✅ **صحيح**: `GET /api/v4/location?organizationId=45`
- ❌ **خطأ**: `GET /api/v4/location/123` (path parameter)
- ❌ **خطأ**: `GET /api/v4/location/by-organization/45` (path parameter)

**في Node-RED**: استخدم `msg.req.query` وليس `msg.req.params`

📖 راجع ملف **QUERY_PARAMETERS_RULE.md** للتفاصيل الكاملة.

## 📁 الملفات المتوفرة

1. **NODE_RED_FLOW_ANALYSIS.md** - تحليل شامل للمشاكل والتعديلات المطلوبة
2. **NODE_RED_FLOW_FIXES.json** - التعديلات بصيغة JSON جاهزة للاستخدام
3. **QUERY_PARAMETERS_RULE.md** - دليل شامل لقاعدة Query Parameters Only

## 🚀 خطوات التطبيق

### 1. فتح Node-RED Editor
- افتح Node-RED في المتصفح
- اذهب إلى Flow الذي تريد تعديله

### 2. تطبيق التعديلات على Locations API Tab

#### أ. تغيير URLs:
1. ابحث عن Node "GET Location by ID" (id: 9859123b064ef147)
2. اضغط عليه وافتح الإعدادات
3. غيّر URL من `/api/v4/locations` إلى `/api/v4/location`
4. كرر نفس الخطوة لجميع Nodes في Locations API tab

#### ب. تحديث Function Node "Query All Locations":
1. افتح Node "Query All Locations" (id: 82c748dfc7223903)
2. انسخ الكود الجديد من `NODE_RED_FLOW_FIXES.json` → `locations_api.changes[4].new_function_code`
3. الصق الكود في Function Node
4. **مهم**: تأكد من استخدام `msg.req.query` وليس `msg.req.params`
5. احفظ التغييرات

#### ب-1. إزالة Node "Query Locations by Organization":
1. **مهم**: يجب إزالة Node "GET Locations by Organization" (id: 55618af9d9b39866)
2. الوظيفة الآن متوفرة في GET /api/v4/location?organizationId={id}
3. استخدم query parameter بدلاً من endpoint منفصل

#### ج. إضافة DELETE endpoint:
1. من القائمة الجانبية، اسحب "http in" node
2. اضبطه على:
   - URL: `/api/v4/location`
   - Method: `delete`
3. اسحب "function" node وانسخ الكود من `NODE_RED_FLOW_FIXES.json` → `locations_api.new_nodes.delete_location_function`
4. اسحب "function" node آخر للتحقق من الشواحن
5. وصّل Nodes كما هو موضح في الـ JSON

### 3. تطبيق التعديلات على Chargers API Tab

#### أ. تحديث Function Node "Query Chargers Status":
1. افتح Node "Query Chargers Status" (id: 0713edffda09ca7b)
2. انسخ الكود الجديد من `NODE_RED_FLOW_FIXES.json` → `chargers_api.changes[0].new_function_code`
3. الصق الكود في Function Node

#### ب. تحديث جميع SQL Queries:
1. افتح كل Function Node الذي يحتوي على SQL query
2. غيّر اسم الجدول من `chargers` إلى `ocpp_CSGO.Chargers`
3. استخدم الكود الجديد من `NODE_RED_FLOW_FIXES.json`

#### ج. إضافة التحقق من Connectors قبل الحذف:
1. أضف Function Node جديد للتحقق من Connectors
2. استخدم الكود من `NODE_RED_FLOW_FIXES.json` → `chargers_api.new_nodes.delete_charger_check`

### 4. إضافة CORS Headers

1. افتح جميع HTTP Response nodes
2. في قسم Headers، أضف:
   ```
   Content-Type: application/json
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```

### 5. Deploy التغييرات

1. اضغط على زر "Deploy" في Node-RED
2. تأكد من عدم وجود أخطاء في الـ Debug panel

## ✅ قائمة التحقق

- [ ] تم تغيير جميع URLs في Locations API tab
- [ ] تم تحديث Function Node "Query All Locations"
- [ ] تم إضافة DELETE endpoint للـ Locations
- [ ] تم تحديث Function Node "Query Chargers Status"
- [ ] تم تغيير اسم الجدول في جميع SQL queries
- [ ] تم إضافة التحقق من Connectors قبل حذف Charger
- [ ] تم إضافة CORS headers لجميع Responses
- [ ] تم Deploy التغييرات
- [ ] تم اختبار جميع Endpoints

## 🧪 اختبار Endpoints

استخدم Postman أو curl لاختبار Endpoints:

```bash
# ✅ صحيح - استخدام query parameters
curl -X GET "http://localhost:1880/api/v4/org"
curl -X GET "http://localhost:1880/api/v4/org?id=1"
curl -X GET "http://localhost:1880/api/v4/location?organizationId=1"
curl -X GET "http://localhost:1880/api/v4/charger?locationId=1"
curl -X GET "http://localhost:1880/api/v4/charger?status=online&locationId=1"
curl -X DELETE "http://localhost:1880/api/v4/location?id=1"
curl -X PUT "http://localhost:1880/api/v4/org?id=1" -H "Content-Type: application/json" -d '{"name":"Test"}'

# ❌ خطأ - لا تستخدم path parameters
# curl -X GET "http://localhost:1880/api/v4/org/1"  ❌
# curl -X GET "http://localhost:1880/api/v4/location/by-organization/1"  ❌
```

## 📝 ملاحظات مهمة

1. **Database Schema**: تأكد من أن أسماء الجداول صحيحة:
   - `ocpp_CSGO.Organizations`
   - `ocpp_CSGO.Locations`
   - `ocpp_CSGO.Chargers`
   - `ocpp_CSGO.Connectors`

2. **Response Format**: جميع Responses يجب أن تتبع:
   ```json
   {
     "success": true,
     "count": N,
     "data": [...]
   }
   ```

3. **Error Handling**: تأكد من معالجة الأخطاء بشكل صحيح

4. **SQL Injection**: استخدم Parameterized Queries دائماً

5. **Query Parameters Only**: 
   - ✅ استخدم `msg.req.query` في Function Nodes
   - ❌ لا تستخدم `msg.req.params`
   - ✅ استخدم `/api/v4/location?id=123`
   - ❌ لا تستخدم `/api/v4/location/123`
   - راجع **QUERY_PARAMETERS_RULE.md** للتفاصيل

## 🆘 في حالة وجود مشاكل

1. تحقق من Node-RED Debug panel للأخطاء
2. تحقق من Database connection
3. تحقق من أسماء الجداول والأعمدة
4. تحقق من Response format

---

**آخر تحديث**: 2024-01-19
