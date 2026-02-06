# دليل ربط Node-RED API مع مشروع الفرونت إند

## الخطوات المطلوبة

### 1. تحديث ملف `.env`

قم بتحديث ملف `.env` في مجلد `Front-end`:

```env
VITE_API_BASE_URL=http://127.0.0.1:1880/api
```

**ملاحظة:** يجب أن يحتوي `API_BASE_URL` على `/api` في النهاية لأن الـ endpoints في Node-RED تبدأ بـ `/api/v4/...`

### 2. التحقق من Node-RED Flow

تأكد من أن Node-RED يعمل على `http://127.0.0.1:1880` وأن الـ Flow منشور (Deployed).

### 3. التحقق من CORS

تأكد من أن Node-RED يسمح بـ CORS من الفرونت إند. الـ headers المطلوبة موجودة في الـ flow:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}
```

### 4. إعادة تشغيل مشروع الفرونت إند

بعد تحديث ملف `.env`، يجب إعادة تشغيل مشروع الفرونت إند:

```bash
# أوقف السيرفر الحالي (Ctrl+C)
# ثم أعد التشغيل
npm run dev
```

## الـ API Endpoints المتاحة

### Organizations API
- `GET http://127.0.0.1:1880/api/v4/org` - جلب جميع المنظمات
- `GET http://127.0.0.1:1880/api/v4/org?id={id}` - جلب منظمة واحدة
- `POST http://127.0.0.1:1880/api/v4/org` - إنشاء منظمة
- `PUT http://127.0.0.1:1880/api/v4/org?id={id}` - تحديث منظمة
- `DELETE http://127.0.0.1:1880/api/v4/org?id={id}` - حذف منظمة

### Locations API
- `GET http://127.0.0.1:1880/api/v4/location` - جلب جميع المواقع
- `GET http://127.0.0.1:1880/api/v4/location?id={id}` - جلب موقع واحد
- `GET http://127.0.0.1:1880/api/v4/location?organizationId={id}` - جلب مواقع منظمة
- `POST http://127.0.0.1:1880/api/v4/location` - إنشاء موقع
- `PUT http://127.0.0.1:1880/api/v4/location?id={id}` - تحديث موقع
- `DELETE http://127.0.0.1:1880/api/v4/location?id={id}` - حذف موقع

### Chargers API
- `GET http://127.0.0.1:1880/api/v4/charger` - جلب جميع الشواحن
- `GET http://127.0.0.1:1880/api/v4/charger?id={id}` - جلب شاحن واحد
- `GET http://127.0.0.1:1880/api/v4/charger?status={status}` - جلب شواحن حسب الحالة
- `GET http://127.0.0.1:1880/api/v4/charger?locationId={id}` - جلب شواحن موقع
- `POST http://127.0.0.1:1880/api/v4/charger` - إنشاء شاحن
- `PUT http://127.0.0.1:1880/api/v4/charger?id={id}` - تحديث شاحن
- `DELETE http://127.0.0.1:1880/api/v4/charger?id={id}` - حذف شاحن

### Connectors API
- `GET http://127.0.0.1:1880/api/v4/connector` - جلب جميع الـ Connectors
- `GET http://127.0.0.1:1880/api/v4/connector?id={id}` - جلب Connector واحد
- `GET http://127.0.0.1:1880/api/v4/connector?chargerId={id}` - جلب Connectors شاحن
- `POST http://127.0.0.1:1880/api/v4/connector` - إنشاء Connector
- `PUT http://127.0.0.1:1880/api/v4/connector?id={id}` - تحديث Connector
- `DELETE http://127.0.0.1:1880/api/v4/connector?id={id}` - حذف Connector

### Tariffs API
- `GET http://127.0.0.1:1880/api/v4/tariff` - جلب جميع التعرفة
- `GET http://127.0.0.1:1880/api/v4/tariff?id={id}` - جلب تعرفة واحدة
- `GET http://127.0.0.1:1880/api/v4/tariff?connectorId={id}` - جلب تعرفة Connector
- `GET http://127.0.0.1:1880/api/v4/tariff?status={status}` - جلب تعرفة حسب الحالة
- `GET http://127.0.0.1:1880/api/v4/tariff?peakType={type}` - جلب تعرفة حسب Peak Type
- `POST http://127.0.0.1:1880/api/v4/tariff` - إنشاء تعرفة
- `PUT http://127.0.0.1:1880/api/v4/tariff?id={id}` - تحديث تعرفة
- `DELETE http://127.0.0.1:1880/api/v4/tariff?id={id}` - حذف تعرفة

## اختبار الاتصال

يمكنك اختبار الاتصال باستخدام curl أو Postman:

```bash
# اختبار جلب المنظمات
curl http://127.0.0.1:1880/api/v4/org

# اختبار جلب المواقع
curl http://127.0.0.1:1880/api/v4/location

# اختبار جلب الشواحن
curl http://127.0.0.1:1880/api/v4/charger
```

## استكشاف الأخطاء

### مشكلة: CORS Error
**الحل:** تأكد من أن Node-RED يرسل الـ CORS headers الصحيحة في HTTP Response nodes.

### مشكلة: 404 Not Found
**الحل:** 
1. تأكد من أن Node-RED Flow منشور (Deployed)
2. تأكد من أن الـ URL صحيح: `http://127.0.0.1:1880/api/v4/...`
3. تحقق من أن الـ HTTP In nodes في Node-RED تستخدم المسار الصحيح

### مشكلة: Connection Refused
**الحل:**
1. تأكد من أن Node-RED يعمل على البورت 1880
2. تحقق من إعدادات Firewall
3. جرب استخدام `localhost` بدلاً من `127.0.0.1`

### مشكلة: البيانات لا تظهر
**الحل:**
1. افتح Developer Console في المتصفح (F12)
2. تحقق من الـ Network tab لرؤية الـ requests والـ responses
3. تحقق من الـ Console للأخطاء

## ملاحظات مهمة

1. **Query Parameters Only**: جميع الـ APIs تستخدم Query Parameters فقط، وليس Path Parameters
2. **Response Format**: جميع الـ responses تتبع نفس التنسيق:
   ```json
   {
     "success": true,
     "count": 1,
     "data": [...]
   }
   ```
3. **Error Handling**: جميع الـ errors تتبع نفس التنسيق:
   ```json
   {
     "success": false,
     "message": "Error message",
     "details": "Error details"
   }
   ```

## الملفات المهمة

- `.env` - ملف الإعدادات (يحتوي على `VITE_API_BASE_URL`)
- `src/services/api.ts` - ملف الـ API services
- `API_ENDPOINTS_DOCUMENTATION.md` - توثيق شامل لجميع الـ endpoints

---

**آخر تحديث:** يناير 2026
