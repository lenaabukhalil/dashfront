# Dashboard Integration Guide - دليل ربط Dashboard

## 📋 نظرة عامة

هذا الدليل يوضح كيفية ربط صفحة Dashboard بالـ API. Dashboard يحتاج إلى 3 endpoints رئيسية:

1. **Dashboard Statistics** - إحصائيات شاملة
2. **Active Sessions** - جلسات الشحن النشطة (ION)
3. **Local Sessions** - جلسات الشحن المحلية

---

## 🎯 الـ Endpoints المطلوبة

### 1. Dashboard Statistics
```
GET /api/dashboard/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "activeSessions": 5,
    "utilization": 75.5,
    "chargersOnline": 45,
    "newUsers": 12,
    "sessions": 150,
    "payments": 200,
    "faults": 3,
    "revenue": 5000.50,
    "tariffAC": 0.25,
    "tariffDC": 0.30,
    "eFawateerCom": 2000.00,
    "ni": 1500.00,
    "orangeMoney": 1000.00,
    "totalCashIn": 4500.00,
    "expendature": 500.00
  }
}
```

---

### 2. Active Sessions (ION)
```
GET /api/dashboard/active-sessions
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "Start Date/Time": "2024-01-19T10:30:00Z",
      "Session ID": "session-123",
      "Location": "Location 1",
      "Charger": "Charger 1",
      "Connector": "Connector 1",
      "Energy (KWH)": 15.5,
      "Amount (JOD)": 4.65,
      "mobile": "+962791234567",
      "User ID": "user-123"
    }
  ]
}
```

---

### 3. Local Sessions
```
GET /api/dashboard/local-sessions
```

**Response**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "Start Date/Time": "2024-01-19T10:30:00Z",
      "Location": "Location 1",
      "Charger": "Charger 1",
      "Connector": "Connector 1",
      "Energy (KWH)": 15.5,
      "Amount (JOD)": 4.65,
      "User ID": "user-123"
    }
  ]
}
```

---

## 🔧 الإعدادات الحالية

### Base URL
الـ Base URL موجود في `.env`:
```
VITE_API_BASE_URL=http://127.0.0.1:1880/api
```

### API Functions
الـ functions موجودة في `src/services/api.ts`:
- `fetchDashboardStats()` - يستدعي `/api/dashboard/stats`
- `fetchActiveSessions()` - يستدعي `/api/dashboard/active-sessions`
- `fetchLocalSessions()` - يستدعي `/api/dashboard/local-sessions`

### Components التي تستخدم الـ API
- `GlanceSection.tsx` - يستخدم `fetchDashboardStats()`
- `AccountantDashboard.tsx` - يستخدم `fetchDashboardStats()`
- `OperatorDashboard.tsx` - يستخدم `fetchActiveSessions()` و `fetchChargersStatus()`
- `SessionTables.tsx` - يستخدم `fetchActiveSessions()` و `fetchLocalSessions()`

---

## ✅ Checklist

### في Node-RED (Backend)
- [ ] إنشاء endpoint `/api/dashboard/stats`
  - [ ] يعيد جميع الحقول المطلوبة
  - [ ] Response format: `{ success: true, data: {...} }`
  
- [ ] إنشاء endpoint `/api/dashboard/active-sessions`
  - [ ] يعيد قائمة الجلسات النشطة
  - [ ] Response format: `{ success: true, count: N, data: [...] }`
  
- [ ] إنشاء endpoint `/api/dashboard/local-sessions`
  - [ ] يعيد قائمة الجلسات المحلية
  - [ ] Response format: `{ success: true, count: N, data: [...] }`

- [ ] تفعيل CORS في Node-RED
  - [ ] `Access-Control-Allow-Origin: *`
  - [ ] `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - [ ] `Access-Control-Allow-Headers: Content-Type, Authorization`

### في Frontend (جاهز ✅)
- [x] API functions موجودة في `api.ts`
- [x] Components تستخدم الـ API functions
- [x] Error handling موجود
- [x] Auto-refresh كل 5-10 ثوانٍ

---

## 🧪 اختبار الـ Endpoints

### 1. اختبار Dashboard Stats
```bash
curl http://127.0.0.1:1880/api/dashboard/stats
```

### 2. اختبار Active Sessions
```bash
curl http://127.0.0.1:1880/api/dashboard/active-sessions
```

### 3. اختبار Local Sessions
```bash
curl http://127.0.0.1:1880/api/dashboard/local-sessions
```

---

## 🐛 Troubleshooting

### المشكلة: Dashboard لا يعرض بيانات
**الحل**:
1. افتح Developer Tools (F12)
2. اذهب إلى Console
3. ابحث عن أخطاء API
4. تأكد من أن الـ endpoints تعمل

### المشكلة: CORS Error
**الحل**:
1. تأكد من تفعيل CORS في Node-RED
2. تأكد من أن الـ Base URL صحيح

### المشكلة: البيانات لا تتحدث
**الحل**:
1. Dashboard يعيد تحديث البيانات كل 5-10 ثوانٍ تلقائياً
2. إذا لم تتحدث، تحقق من Console للأخطاء

---

## 📝 ملاحظات

1. **Response Format**: جميع الـ responses يجب أن تتبع نفس التنسيق:
   ```json
   {
     "success": true,
     "count": 5,
     "data": [...]
   }
   ```

2. **Error Handling**: في حالة الخطأ:
   ```json
   {
     "success": false,
     "message": "Error message"
   }
   ```

3. **Empty Data**: في حالة عدم وجود بيانات:
   ```json
   {
     "success": true,
     "count": 0,
     "data": []
   }
   ```

---

## 🚀 الخطوات التالية

1. **أنشئ الـ Endpoints في Node-RED**
   - استخدم Node-RED flows لإنشاء الـ endpoints
   - راجع `NODE_RED_API_DOCUMENTATION.md` للمساعدة

2. **اختبر الـ Endpoints**
   - استخدم Postman أو curl
   - تأكد من Response format

3. **Dashboard سيعمل تلقائياً**
   - لا حاجة لتعديل Frontend code
   - فقط تأكد من أن الـ endpoints تعمل

---

## 📚 ملفات مرجعية

- `DASHBOARD_API_REQUIREMENTS.md` - تفاصيل شاملة لكل endpoint
- `DASHBOARD_API_SUMMARY_AR.md` - ملخص بالعربية
- `API_ENDPOINTS_DOCUMENTATION.md` - توثيق API العام
- `NODE_RED_API_DOCUMENTATION.md` - توثيق Node-RED API

---

**آخر تحديث**: يناير 2026
