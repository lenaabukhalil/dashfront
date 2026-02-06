# اختبار الـ Endpoints الموجودة - Test Existing Endpoints

هذا الملف يحتوي على أوامر curl لاختبار جميع الـ endpoints الموجودة بالفعل.

---

## 🔧 الإعدادات

**Base URL**: `http://127.0.0.1:1880/api`

---

## ✅ اختبار الـ Endpoints الموجودة

### 1. Organizations - المنظمات

```bash
# Get all organizations
curl "http://127.0.0.1:1880/api/v4/org"

# Get specific organization
curl "http://127.0.0.1:1880/api/v4/org?id=1"
```

**Response المتوقع**:
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

---

### 2. Locations - المواقع

```bash
# Get all locations
curl "http://127.0.0.1:1880/api/v4/location"

# Get locations by organization
curl "http://127.0.0.1:1880/api/v4/location?organizationId=5"

# Get specific location
curl "http://127.0.0.1:1880/api/v4/location?id=1"
```

**Response المتوقع**:
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

---

### 3. Chargers - الشواحن

```bash
# Get all chargers
curl "http://127.0.0.1:1880/api/v4/charger"

# Get online chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=online"

# Get offline chargers
curl "http://127.0.0.1:1880/api/v4/charger?status=offline"

# Get chargers by location
curl "http://127.0.0.1:1880/api/v4/charger?locationId=5"

# Get specific charger
curl "http://127.0.0.1:1880/api/v4/charger?id=1"

# Combined filters
curl "http://127.0.0.1:1880/api/v4/charger?status=online&locationId=5"
```

**Response المتوقع**:
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

---

### 4. Connectors - الموصلات

```bash
# Get all connectors
curl "http://127.0.0.1:1880/api/v4/connector"

# Get connectors by charger
curl "http://127.0.0.1:1880/api/v4/connector?chargerId=5"

# Get specific connector
curl "http://127.0.0.1:1880/api/v4/connector?id=1"
```

**Response المتوقع**:
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

---

### 5. Tariffs - التعريفات

```bash
# Get all tariffs
curl "http://127.0.0.1:1880/api/v4/tariff"

# Get tariffs by connector
curl "http://127.0.0.1:1880/api/v4/tariff?connectorId=5"

# Get specific tariff
curl "http://127.0.0.1:1880/api/v4/tariff?id=1"
```

**Response المتوقع**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "type": "residential",
      "buy_rate": 0.15,
      "sell_rate": 0.12,
      "status": "Active"
    }
  ]
}
```

---

## 🧪 اختبار سريع - Quick Test Script

يمكنك نسخ هذا السكريبت ووضعه في ملف `test-endpoints.sh`:

```bash
#!/bin/bash

BASE_URL="http://127.0.0.1:1880/api"

echo "🧪 Testing Existing Endpoints..."
echo ""

echo "1️⃣ Testing Organizations..."
curl -s "${BASE_URL}/v4/org" | jq '.' || echo "❌ Failed"
echo ""

echo "2️⃣ Testing Locations..."
curl -s "${BASE_URL}/v4/location" | jq '.' || echo "❌ Failed"
echo ""

echo "3️⃣ Testing Online Chargers..."
curl -s "${BASE_URL}/v4/charger?status=online" | jq '.' || echo "❌ Failed"
echo ""

echo "4️⃣ Testing Offline Chargers..."
curl -s "${BASE_URL}/v4/charger?status=offline" | jq '.' || echo "❌ Failed"
echo ""

echo "5️⃣ Testing Connectors..."
curl -s "${BASE_URL}/v4/connector" | jq '.' || echo "❌ Failed"
echo ""

echo "✅ Testing Complete!"
```

**للاستخدام**:
```bash
chmod +x test-endpoints.sh
./test-endpoints.sh
```

---

## 🌐 اختبار من المتصفح

يمكنك أيضاً اختبار الـ endpoints مباشرة من المتصفح:

1. **Organizations**: 
   ```
   http://127.0.0.1:1880/api/v4/org
   ```

2. **Locations**: 
   ```
   http://127.0.0.1:1880/api/v4/location
   ```

3. **Online Chargers**: 
   ```
   http://127.0.0.1:1880/api/v4/charger?status=online
   ```

4. **Offline Chargers**: 
   ```
   http://127.0.0.1:1880/api/v4/charger?status=offline
   ```

5. **Connectors**: 
   ```
   http://127.0.0.1:1880/api/v4/connector
   ```

---

## ⚠️ ملاحظات مهمة

### 1. CORS
إذا واجهت مشكلة CORS عند الاختبار من المتصفح، تأكد من:
- تفعيل CORS في Node-RED
- استخدام نفس الـ origin

### 2. Response Format
جميع الـ responses يجب أن تتبع هذا التنسيق:
```json
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

### 3. Empty Response
إذا لم توجد بيانات، يجب أن يعيد:
- Status: `204 No Content`
- أو:
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

### 4. Error Response
في حالة الخطأ:
```json
{
  "success": false,
  "message": "Error message"
}
```

---

## 🔍 Debugging Tips

### 1. تحقق من Console
افتح Developer Tools (F12) في Dashboard وتحقق من Console للأخطاء.

### 2. Network Tab
تحقق من Network tab لرؤية الـ API requests والـ responses.

### 3. API Response
تأكد من أن الـ response format يطابق ما يتوقعه Frontend.

---

## ✅ Checklist

قبل البدء في ربط Dashboard، تأكد من:

- [ ] `/api/v4/org` يعمل ويعيد بيانات
- [ ] `/api/v4/location` يعمل ويعيد بيانات
- [ ] `/api/v4/charger?status=online` يعمل ويعيد بيانات
- [ ] `/api/v4/charger?status=offline` يعمل ويعيد بيانات
- [ ] `/api/v4/charger?locationId=X` يعمل ويعيد بيانات
- [ ] `/api/v4/connector?chargerId=X` يعمل ويعيد بيانات
- [ ] Response format صحيح (success, count, data)
- [ ] CORS مفعل في Node-RED

---

**آخر تحديث**: يناير 2026
