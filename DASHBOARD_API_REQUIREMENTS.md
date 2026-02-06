# Dashboard API Requirements - متطلبات API للوحة التحكم

هذا الملف يوضح جميع الـ API endpoints المطلوبة لربط صفحة Dashboard بالـ API.

## 📋 ملخص سريع

Dashboard يحتاج إلى الـ endpoints التالية:

### 1. Dashboard Statistics Endpoint
- **URL**: `/api/dashboard/stats` أو `/api/v4/dashboard/stats`
- **Method**: `GET`
- **المستخدم في**: `GlanceSection`, `AccountantDashboard`, `KpiCards`

### 2. Active Sessions Endpoint
- **URL**: `/api/dashboard/active-sessions` أو `/api/v4/dashboard/active-sessions`
- **Method**: `GET`
- **المستخدم في**: `OperatorDashboard`, `SessionTables`

### 3. Local Sessions Endpoint
- **URL**: `/api/dashboard/local-sessions` أو `/api/v4/dashboard/local-sessions`
- **Method**: `GET`
- **المستخدم في**: `SessionTables`

### 4. Chargers Status Endpoint
- **URL**: `/api/v4/charger?status=online` و `/api/v4/charger?status=offline`
- **Method**: `GET`
- **المستخدم في**: `OperatorDashboard`

---

## 🔍 تفاصيل كل Endpoint

### 1. Dashboard Statistics (`/api/dashboard/stats`)

**الغرض**: إرجاع إحصائيات شاملة للوحة التحكم

**Response Format**:
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

**الحقول المطلوبة**:
- `activeSessions` (number): عدد الجلسات النشطة حالياً
- `utilization` (number): نسبة الاستخدام (%)
- `chargersOnline` (number): عدد الشواحن المتصلة
- `newUsers` (number): عدد المستخدمين الجدد
- `sessions` (number): إجمالي عدد الجلسات
- `payments` (number): إجمالي عدد المدفوعات
- `faults` (number): عدد الأعطال
- `revenue` (number): الإيرادات (JOD)
- `tariffAC` (number): تعرفة AC (JOD/kWh)
- `tariffDC` (number): تعرفة DC (JOD/kWh)
- `eFawateerCom` (number): إجمالي من eFawateerCom (JOD)
- `ni` (number): إجمالي من NI (JOD)
- `orangeMoney` (number): إجمالي من Orange Money (JOD)
- `totalCashIn` (number): إجمالي النقد الوارد (JOD)
- `expendature` (number): المصروفات (JOD)

**المستخدم في**:
- `GlanceSection.tsx` - يعرض جميع الإحصائيات
- `AccountantDashboard.tsx` - يستخدم: `revenue`, `payments`, `totalCashIn`, `expendature`
- `KpiCards.tsx` - يستخدم: `chargersOnline`, `newUsers`, `tariffAC`, `tariffDC`, `revenue`, `payments`, `sessions`, `faults`

---

### 2. Active Sessions (`/api/dashboard/active-sessions`)

**الغرض**: إرجاع قائمة بجلسات الشحن النشطة (ION Sessions)

**Response Format**:
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

**الحقول المطلوبة**:
- `Start Date/Time` (string): تاريخ ووقت بدء الجلسة
- `Session ID` (string): معرف الجلسة
- `Location` (string): اسم الموقع
- `Charger` (string): اسم الشاحن
- `Connector` (string): اسم الموصل
- `Energy (KWH)` (number): الطاقة المستهلكة (كيلوواط ساعة)
- `Amount (JOD)` (number): المبلغ (دينار أردني)
- `mobile` (string, optional): رقم الهاتف
- `User ID` (string, optional): معرف المستخدم

**المستخدم في**:
- `OperatorDashboard.tsx` - يعرض عدد الجلسات النشطة
- `SessionTables.tsx` - يعرض جدول الجلسات النشطة

---

### 3. Local Sessions (`/api/dashboard/local-sessions`)

**الغرض**: إرجاع قائمة بجلسات الشحن المحلية النشطة

**Response Format**:
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

**الحقول المطلوبة**:
- `Start Date/Time` (string): تاريخ ووقت بدء الجلسة
- `Location` (string): اسم الموقع
- `Charger` (string): اسم الشاحن
- `Connector` (string): اسم الموصل
- `Energy (KWH)` (number): الطاقة المستهلكة
- `Amount (JOD)` (number): المبلغ
- `User ID` (string): معرف المستخدم

**المستخدم في**:
- `SessionTables.tsx` - يعرض جدول الجلسات المحلية

---

### 4. Chargers Status (موجود بالفعل في API)

**الغرض**: إرجاع حالة الشواحن (Online/Offline)

**Endpoints المستخدمة**:
- `/api/v4/charger?status=online` - الشواحن المتصلة
- `/api/v4/charger?status=offline` - الشواحن غير المتصلة

**Response Format** (من API الحالي):
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Charger 1",
      "chargerID": "CHG001",
      "time": "2024-01-15T10:30:00Z",
      "status": "online",
      "type": "AC",
      "locationId": 5
    }
  ]
}
```

**المستخدم في**:
- `OperatorDashboard.tsx` - يعرض عدد الشواحن Online/Offline

---

## 📝 ملاحظات مهمة

### 1. Base URL
- الـ API Base URL موجود في `.env`: `VITE_API_BASE_URL=http://127.0.0.1:1880/api`
- الـ endpoints يجب أن تكون: `${API_BASE_URL}/dashboard/stats` = `http://127.0.0.1:1880/api/dashboard/stats`

### 2. Response Format
- جميع الـ responses يجب أن تتبع نفس التنسيق:
  ```json
  {
    "success": true,
    "count": 5,
    "data": [...]
  }
  ```
- أو في حالة الخطأ:
  ```json
  {
    "success": false,
    "message": "Error message"
  }
  ```

### 3. Error Handling
- في حالة عدم وجود بيانات، يجب إرجاع:
  - Status: `204 No Content`
  - Body: `[]`
- أو:
  ```json
  {
    "success": true,
    "count": 0,
    "data": []
  }
  ```

### 4. CORS
- يجب التأكد من أن الـ API يدعم CORS headers:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## ✅ Checklist - قائمة التحقق

قبل البدء في ربط Dashboard، تأكد من:

- [ ] **Dashboard Stats Endpoint** (`/api/dashboard/stats`)
  - [ ] يعيد جميع الحقول المطلوبة
  - [ ] Response format صحيح
  - [ ] Error handling موجود

- [ ] **Active Sessions Endpoint** (`/api/dashboard/active-sessions`)
  - [ ] يعيد قائمة الجلسات النشطة
  - [ ] جميع الحقول موجودة
  - [ ] Response format صحيح

- [ ] **Local Sessions Endpoint** (`/api/dashboard/local-sessions`)
  - [ ] يعيد قائمة الجلسات المحلية
  - [ ] جميع الحقول موجودة
  - [ ] Response format صحيح

- [ ] **Chargers Status** (موجود بالفعل)
  - [ ] `/api/v4/charger?status=online` يعمل
  - [ ] `/api/v4/charger?status=offline` يعمل

- [ ] **CORS Configuration**
  - [ ] CORS مفعل في الـ API
  - [ ] Headers صحيحة

- [ ] **Testing**
  - [ ] اختبر جميع الـ endpoints
  - [ ] تأكد من أن البيانات تظهر في Dashboard
  - [ ] تأكد من Error handling

---

## 🚀 الخطوات التالية

1. **إنشاء/تحديث Dashboard Endpoints في Node-RED**
   - `/api/dashboard/stats`
   - `/api/dashboard/active-sessions`
   - `/api/dashboard/local-sessions`

2. **اختبار الـ Endpoints**
   - استخدم Postman أو curl لاختبار كل endpoint
   - تأكد من Response format

3. **ربط Frontend**
   - الـ functions موجودة في `src/services/api.ts`
   - فقط تأكد من أن الـ URLs صحيحة

4. **اختبار Dashboard**
   - افتح Dashboard في المتصفح
   - تحقق من أن البيانات تظهر
   - تحقق من Console للأخطاء

---

## 📞 ملاحظات إضافية

- جميع الـ endpoints الحالية في `api.ts` تستخدم `${API_BASE_URL}/dashboard/...`
- إذا كان الـ API في Node-RED يستخدم مسار مختلف (مثل `/api/v4/dashboard/...`)، يجب تحديث الـ URLs في `api.ts`
- الـ Dashboard يعيد تحديث البيانات كل 5-10 ثوانٍ تلقائياً

---

**آخر تحديث**: يناير 2026
