# Dashboard - الأشياء المربوطة بالفعل

هذا الملف يوضح ما هو مربوط بالفعل في Dashboard وما يحتاج فقط إلى التأكد من عمله.

---

## ✅ الأشياء المربوطة بالفعل (موجودة في API Documentation)

### 1. Chargers Status - حالة الشواحن ✅

**المكون**: `OperatorDashboard.tsx`

**الـ API Functions**:
- `fetchChargersStatus()` - يجمع بين online و offline
- `fetchOnlineChargers()` - `/api/v4/charger?status=online`
- `fetchOfflineChargers()` - `/api/v4/charger?status=offline`

**الـ Endpoints** (موجودة في `API_ENDPOINTS_DOCUMENTATION.md`):
```
GET /api/v4/charger?status=online
GET /api/v4/charger?status=offline
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Charger 1",
      "chargerID": "CHG001",
      "status": "online",
      "type": "AC",
      "locationId": 5
    }
  ]
}
```

**الحالة**: ✅ جاهز - فقط تأكد من أن الـ endpoint يعمل في Node-RED

---

### 2. Organizations - المنظمات ✅

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchChargerOrganizations()` - `/api/v4/org`

**الـ Endpoint** (موجود في `API_ENDPOINTS_DOCUMENTATION.md`):
```
GET /api/v4/org
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Organization 1"
    }
  ]
}
```

**الحالة**: ✅ جاهز - فقط تأكد من أن الـ endpoint يعمل في Node-RED

---

### 3. Locations - المواقع ✅

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchLocationsByOrg(organizationId)` - `/api/v4/location?organizationId=X`

**الـ Endpoint** (موجود في `API_ENDPOINTS_DOCUMENTATION.md`):
```
GET /api/v4/location?organizationId=5
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "location_id": 1,
      "organization_id": 5,
      "name": "Location 1",
      "name_ar": "موقع 1"
    }
  ]
}
```

**الحالة**: ✅ جاهز - فقط تأكد من أن الـ endpoint يعمل في Node-RED

---

### 4. Chargers by Location - الشواحن حسب الموقع ✅

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchChargersByLocation(locationId)` - `/api/v4/charger?locationId=X`

**الـ Endpoint** (موجود في `API_ENDPOINTS_DOCUMENTATION.md`):
```
GET /api/v4/charger?locationId=5
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Charger 1",
      "chargerID": "CHG001",
      "status": "online",
      "type": "AC",
      "locationId": 5
    }
  ]
}
```

**الحالة**: ✅ جاهز - فقط تأكد من أن الـ endpoint يعمل في Node-RED

---

### 5. Connectors by Charger - الموصلات حسب الشاحن ✅

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchConnectorsByCharger(chargerId)` - `/api/v4/connector?chargerId=X`

**الـ Endpoint** (موجود في `API_ENDPOINTS_DOCUMENTATION.md`):
```
GET /api/v4/connector?chargerId=5
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "chargerId": 5,
      "type": "Type2",
      "status": "Available",
      "power": 22
    }
  ]
}
```

**الحالة**: ✅ جاهز - فقط تأكد من أن الـ endpoint يعمل في Node-RED

---

## ⚠️ الأشياء التي تحتاج إنشاء Endpoints جديدة

### 1. Charger Status (Single) - حالة شاحن واحد

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchChargerStatus(chargerId)` - `/api/dashboard/charger-status?chargerId=X`

**الـ Endpoint المطلوب**:
```
GET /api/dashboard/charger-status?chargerId=1
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "data": {
    "status": "online"
  }
}
```

**أو**:
```json
{
  "status": "online"
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

### 2. Connector Status (Single) - حالة موصل واحد

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `fetchConnectorStatus(connectorId)` - `/api/dashboard/connector-status?connectorId=X`

**الـ Endpoint المطلوب**:
```
GET /api/dashboard/connector-status?connectorId=1
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "data": {
    "status": "Available"
  }
}
```

**أو**:
```json
{
  "status": "Available"
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

### 3. Send Charger Command - إرسال أمر للشاحن

**المكون**: `LocationControl.tsx`

**الـ API Function**:
- `sendChargerCommand(chargerId, command)` - `/api/dashboard/charger-command`

**الـ Endpoint المطلوب**:
```
POST /api/dashboard/charger-command
```

**Request Body**:
```json
{
  "chargerId": "1",
  "command": "restart" // أو "stop" أو "unlock"
}
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "message": "Command sent successfully"
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

### 4. User Info - معلومات المستخدم

**المكون**: `UserInfo.tsx`

**الـ API Function**:
- `fetchUserInfo(mobile)` - `/api/dashboard/user-info?mobile=+962791234567`

**الـ Endpoint المطلوب**:
```
GET /api/dashboard/user-info?mobile=+962791234567
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "data": {
    "mobile": "+962791234567",
    "first_name": "John",
    "last_name": "Doe",
    "balance": 50.00,
    "language": "en",
    "device_id": "device-123"
  }
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

### 5. User Sessions - جلسات المستخدم

**المكون**: `UserInfo.tsx`

**الـ API Function**:
- `fetchUserSessions(mobile)` - `/api/dashboard/user-sessions?mobile=+962791234567`

**الـ Endpoint المطلوب**:
```
GET /api/dashboard/user-sessions?mobile=+962791234567
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "Date/Time": "2024-01-19T10:30:00Z",
      "Charger": "Charger 1",
      "Energy": 15.5,
      "Amount": 4.65
    }
  ]
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

### 6. User Payments - مدفوعات المستخدم

**المكون**: `UserInfo.tsx`

**الـ API Function**:
- `fetchUserPayments(mobile)` - `/api/dashboard/user-payments?mobile=+962791234567`

**الـ Endpoint المطلوب**:
```
GET /api/dashboard/user-payments?mobile=+962791234567
```

**Response Format المطلوب**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "Date/Time": "2024-01-19T10:30:00Z",
      "Source": "eFawateerCom",
      "Amount (JOD)": 50.00
    }
  ]
}
```

**الحالة**: ❌ يحتاج إنشاء endpoint جديد في Node-RED

---

## 📋 ملخص سريع

### ✅ جاهز للاستخدام (موجود في API Documentation):
1. ✅ `/api/v4/charger?status=online` - الشواحن المتصلة
2. ✅ `/api/v4/charger?status=offline` - الشواحن غير المتصلة
3. ✅ `/api/v4/org` - المنظمات
4. ✅ `/api/v4/location?organizationId=X` - المواقع
5. ✅ `/api/v4/charger?locationId=X` - الشواحن حسب الموقع
6. ✅ `/api/v4/connector?chargerId=X` - الموصلات حسب الشاحن

### ❌ يحتاج إنشاء endpoints جديدة:
1. ❌ `/api/dashboard/charger-status?chargerId=X` - حالة شاحن واحد
2. ❌ `/api/dashboard/connector-status?connectorId=X` - حالة موصل واحد
3. ❌ `/api/dashboard/charger-command` (POST) - إرسال أمر للشاحن
4. ❌ `/api/dashboard/user-info?mobile=X` - معلومات المستخدم
5. ❌ `/api/dashboard/user-sessions?mobile=X` - جلسات المستخدم
6. ❌ `/api/dashboard/user-payments?mobile=X` - مدفوعات المستخدم

---

## 🧪 اختبار الـ Endpoints الموجودة

### 1. اختبار Chargers Status
```bash
# Online chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=online"

# Offline chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=offline"
```

### 2. اختبار Organizations
```bash
curl "http://127.0.0.1:1880/api/v4/org"
```

### 3. اختبار Locations
```bash
curl "http://127.0.0.1:1880/api/v4/location?organizationId=5"
```

### 4. اختبار Chargers by Location
```bash
curl "http://127.0.0.1:1880/api/v4/charger?locationId=5"
```

### 5. اختبار Connectors by Charger
```bash
curl "http://127.0.0.1:1880/api/v4/connector?chargerId=5"
```

---

## 🔧 الخطوات التالية

1. **اختبر الـ Endpoints الموجودة**:
   - استخدم curl أو Postman لاختبار كل endpoint
   - تأكد من Response format صحيح

2. **أنشئ الـ Endpoints المفقودة**:
   - راجع `DASHBOARD_API_REQUIREMENTS.md` للتفاصيل
   - أنشئ الـ endpoints في Node-RED

3. **اختبر Dashboard**:
   - افتح Dashboard في المتصفح
   - تحقق من Console للأخطاء
   - تأكد من أن البيانات تظهر

---

**آخر تحديث**: يناير 2026
