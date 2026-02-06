# Dashboard Quick Start - دليل البدء السريع

## 🎯 الهدف

هذا الملف يوضح بسرعة ما تحتاجه لربط Dashboard بالـ API.

---

## ✅ الخطوة 1: اختبر الـ Endpoints الموجودة

### الـ Endpoints الموجودة بالفعل (موجودة في API Documentation):

1. **Organizations** - `/api/v4/org`
2. **Locations** - `/api/v4/location`
3. **Chargers (Online)** - `/api/v4/charger?status=online`
4. **Chargers (Offline)** - `/api/v4/charger?status=offline`
5. **Chargers by Location** - `/api/v4/charger?locationId=X`
6. **Connectors by Charger** - `/api/v4/connector?chargerId=X`

### كيفية الاختبار:

```bash
# اختبار Organizations
curl "http://127.0.0.1:1880/api/v4/org"

# اختبار Online Chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=online"

# اختبار Offline Chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=offline"
```

**أو من المتصفح**:
- افتح: `http://127.0.0.1:1880/api/v4/org`
- يجب أن ترى JSON response

📄 **راجع**: `TEST_EXISTING_ENDPOINTS.md` للتفاصيل الكاملة

---

## ❌ الخطوة 2: أنشئ الـ Endpoints المفقودة

### الـ Endpoints التي تحتاج إنشاء:

#### 1. Dashboard Statistics
```
GET /api/dashboard/stats
```
**يستخدم في**: `GlanceSection`, `AccountantDashboard`, `KpiCards`

#### 2. Active Sessions
```
GET /api/dashboard/active-sessions
```
**يستخدم في**: `OperatorDashboard`, `SessionTables`

#### 3. Local Sessions
```
GET /api/dashboard/local-sessions
```
**يستخدم في**: `SessionTables`

#### 4. Charger Status (Single)
```
GET /api/dashboard/charger-status?chargerId=X
```
**يستخدم في**: `LocationControl`

#### 5. Connector Status (Single)
```
GET /api/dashboard/connector-status?connectorId=X
```
**يستخدم في**: `LocationControl`

#### 6. Send Charger Command
```
POST /api/dashboard/charger-command
Body: { "chargerId": "1", "command": "restart" }
```
**يستخدم في**: `LocationControl`

#### 7. User Info
```
GET /api/dashboard/user-info?mobile=+962791234567
```
**يستخدم في**: `UserInfo`

#### 8. User Sessions
```
GET /api/dashboard/user-sessions?mobile=+962791234567
```
**يستخدم في**: `UserInfo`

#### 9. User Payments
```
GET /api/dashboard/user-payments?mobile=+962791234567
```
**يستخدم في**: `UserInfo`

📄 **راجع**: `DASHBOARD_API_REQUIREMENTS.md` للتفاصيل الكاملة لكل endpoint

---

## 📋 Checklist السريع

### ✅ ما هو جاهز:
- [x] Frontend code جاهز في `src/services/api.ts`
- [x] Components تستخدم الـ API functions
- [x] Error handling موجود
- [x] Auto-refresh كل 5-10 ثوانٍ

### ⚠️ ما يحتاج عمله:
- [ ] اختبر الـ endpoints الموجودة (`/api/v4/...`)
- [ ] أنشئ الـ endpoints المفقودة (`/api/dashboard/...`)
- [ ] تأكد من CORS مفعل في Node-RED
- [ ] اختبر Dashboard في المتصفح

---

## 🚀 الخطوات العملية

### 1. اختبر الـ Endpoints الموجودة
```bash
# افتح Terminal واختبر:
curl "http://127.0.0.1:1880/api/v4/org"
curl "http://127.0.0.1:1880/api/v4/charger?status=online"
```

إذا رأيت JSON response، الـ endpoints تعمل ✅

### 2. أنشئ الـ Endpoints المفقودة في Node-RED
- افتح Node-RED
- أنشئ flows للـ endpoints المفقودة
- راجع `DASHBOARD_API_REQUIREMENTS.md` للتفاصيل

### 3. اختبر Dashboard
- افتح Dashboard في المتصفح
- افتح Developer Tools (F12)
- تحقق من Console للأخطاء
- تحقق من Network tab لرؤية الـ API requests

---

## 📚 الملفات المرجعية

1. **`DASHBOARD_EXISTING_CONNECTIONS.md`** - ما هو مربوط بالفعل
2. **`DASHBOARD_API_REQUIREMENTS.md`** - تفاصيل كل endpoint
3. **`DASHBOARD_INTEGRATION_GUIDE.md`** - دليل الربط الكامل
4. **`TEST_EXISTING_ENDPOINTS.md`** - أوامر اختبار
5. **`API_ENDPOINTS_DOCUMENTATION.md`** - توثيق API العام

---

## 🆘 Troubleshooting

### المشكلة: Dashboard لا يعرض بيانات
**الحل**:
1. افتح Developer Tools (F12)
2. اذهب إلى Console
3. ابحث عن أخطاء API
4. تحقق من Network tab لرؤية الـ requests

### المشكلة: CORS Error
**الحل**:
1. تأكد من تفعيل CORS في Node-RED
2. تأكد من أن الـ Base URL صحيح في `.env`

### المشكلة: البيانات لا تتحدث
**الحل**:
1. Dashboard يعيد تحديث البيانات كل 5-10 ثوانٍ تلقائياً
2. إذا لم تتحدث، تحقق من Console للأخطاء

---

## ✅ النتيجة النهائية

بعد إكمال الخطوات، Dashboard سيعرض:
- ✅ عدد الشواحن Online/Offline
- ✅ الجلسات النشطة
- ✅ الإحصائيات (Revenue, Payments, إلخ)
- ✅ معلومات المستخدمين
- ✅ التحكم في الشواحن

---

**آخر تحديث**: يناير 2026
