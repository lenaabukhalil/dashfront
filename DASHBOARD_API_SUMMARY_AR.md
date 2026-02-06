# ملخص متطلبات Dashboard API - بالعربية

## 🎯 الهدف
هذا الملف يوضح ببساطة ما تحتاجه Dashboard من API endpoints لكي تعمل بشكل صحيح.

---

## 📊 الـ Endpoints المطلوبة

### 1️⃣ إحصائيات Dashboard
**المسار**: `/api/dashboard/stats`  
**الطريقة**: `GET`

**ما يحتاجه Dashboard**:
- عدد الجلسات النشطة (`activeSessions`)
- نسبة الاستخدام (`utilization`)
- عدد الشواحن المتصلة (`chargersOnline`)
- عدد المستخدمين الجدد (`newUsers`)
- إجمالي الجلسات (`sessions`)
- إجمالي المدفوعات (`payments`)
- عدد الأعطال (`faults`)
- الإيرادات (`revenue`)
- تعرفة AC (`tariffAC`)
- تعرفة DC (`tariffDC`)
- إجمالي النقد (`totalCashIn`)
- المصروفات (`expendature`)

**مثال Response**:
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
    "totalCashIn": 4500.00,
    "expendature": 500.00
  }
}
```

---

### 2️⃣ الجلسات النشطة (ION)
**المسار**: `/api/dashboard/active-sessions`  
**الطريقة**: `GET`

**ما يحتاجه Dashboard**:
- قائمة بجميع جلسات الشحن النشطة حالياً
- معلومات كل جلسة: التاريخ، الموقع، الشاحن، الموصل، الطاقة، المبلغ

**مثال Response**:
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
      "mobile": "+962791234567"
    }
  ]
}
```

---

### 3️⃣ الجلسات المحلية
**المسار**: `/api/dashboard/local-sessions`  
**الطريقة**: `GET`

**ما يحتاجه Dashboard**:
- قائمة بجلسات الشحن المحلية النشطة

**مثال Response**:
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

### 4️⃣ حالة الشواحن (موجود بالفعل ✅)
**المسار**: `/api/v4/charger?status=online` و `/api/v4/charger?status=offline`  
**الطريقة**: `GET`

**ملاحظة**: هذا الـ endpoint موجود بالفعل في API Documentation ولا يحتاج تعديل.

---

## ✅ قائمة التحقق السريعة

قبل البدء، تأكد من:

- [ ] **Endpoint `/api/dashboard/stats` موجود ويعمل**
  - يعيد جميع الحقول المطلوبة
  - Response format صحيح

- [ ] **Endpoint `/api/dashboard/active-sessions` موجود ويعمل**
  - يعيد قائمة الجلسات النشطة
  - جميع الحقول موجودة

- [ ] **Endpoint `/api/dashboard/local-sessions` موجود ويعمل**
  - يعيد قائمة الجلسات المحلية
  - جميع الحقول موجودة

- [ ] **CORS مفعل في Node-RED**
  - الـ API يقبل requests من Frontend

---

## 🔧 الإعدادات الحالية

**Base URL**: `http://127.0.0.1:1880/api` (موجود في `.env`)

**الـ Endpoints الكاملة ستكون**:
- `http://127.0.0.1:1880/api/dashboard/stats`
- `http://127.0.0.1:1880/api/dashboard/active-sessions`
- `http://127.0.0.1:1880/api/dashboard/local-sessions`

---

## 📝 ملاحظات مهمة

1. **Response Format**: جميع الـ responses يجب أن تتبع هذا التنسيق:
   ```json
   {
     "success": true,
     "count": 5,
     "data": [...]
   }
   ```

2. **Error Handling**: في حالة عدم وجود بيانات:
   ```json
   {
     "success": true,
     "count": 0,
     "data": []
   }
   ```

3. **CORS**: تأكد من أن Node-RED يدعم CORS للـ endpoints الجديدة

---

## 🚀 الخطوات التالية

1. **أنشئ الـ Endpoints في Node-RED**
   - `/api/dashboard/stats`
   - `/api/dashboard/active-sessions`
   - `/api/dashboard/local-sessions`

2. **اختبر الـ Endpoints**
   - استخدم Postman أو المتصفح
   - تأكد من Response format

3. **Dashboard سيعمل تلقائياً**
   - الـ code موجود في `src/services/api.ts`
   - Dashboard يعيد تحديث البيانات كل 5-10 ثوانٍ

---

**آخر تحديث**: يناير 2026
