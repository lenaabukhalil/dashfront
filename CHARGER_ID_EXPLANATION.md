# الفرق بين `charger_id` و `chargerID` في قاعدة البيانات

## الفرق الأساسي:

### 1. **`charger_id`** (Primary Key - رقم)
- **النوع**: `INT` أو `BIGINT` (رقم)
- **الاستخدام**: Primary Key في جدول `Chargers`
- **أمثلة**: `2007`, `2016`, `2011`
- **الاستخدام في SQL**: 
  ```sql
  WHERE charger_id = 2007
  ```
- **الاستخدام في API**: 
  ```
  GET /api/v4/charger?id=2007
  ```

### 2. **`chargerID`** (معرف نصي/كود)
- **النوع**: `VARCHAR` (نص)
- **الاستخدام**: معرف نصي/كود للشاحن (مثل "AUM-1", "GAM-7")
- **أمثلة**: `"AUM-1"`, `"GAM-7"`, `"ION-5"`
- **الاستخدام في SQL**: 
  ```sql
  WHERE chargerID = 'AUM-1'
  ```
- **الاستخدام في API**: 
  ```
  GET /api/v4/charger?chargerID=AUM-1
  ```

## كيف تعرف الفرق في قاعدة البيانات:

### طريقة 1: استعلام SQL مباشر
```sql
-- عرض جميع الشواحن مع كلا الحقلين
SELECT charger_id, chargerID, name, type, status 
FROM ocpp_CSGO.Chargers 
LIMIT 10;
```

**النتيجة المتوقعة:**
```
charger_id | chargerID | name        | type | status
-----------|-----------|-------------|------|--------
2007       | GAM-7     | Beny - 60KW | AC   | online
2016       | AUM-1     | ION Pro     | AC   | online
2011       | ...       | ...         | ...  | ...
```

### طريقة 2: فحص نوع البيانات
```sql
-- معرفة نوع البيانات لكل حقل
DESCRIBE ocpp_CSGO.Chargers;
```

**النتيجة المتوقعة:**
```
Field        | Type         | Null | Key | Default
-------------|--------------|------|-----|--------
charger_id   | int(11)      | NO   | PRI | NULL
chargerID    | varchar(50)  | YES  |     | NULL
name         | varchar(255) | YES  |     | NULL
...
```

### طريقة 3: البحث عن شاحن معين
```sql
-- البحث بـ charger_id (رقم)
SELECT * FROM ocpp_CSGO.Chargers WHERE charger_id = 2016;

-- البحث بـ chargerID (نص)
SELECT * FROM ocpp_CSGO.Chargers WHERE chargerID = 'AUM-1';
```

## ملاحظات مهمة:

1. **`charger_id`** هو Primary Key (فريد وليس NULL)
2. **`chargerID`** قد يكون NULL أو قد يكون له قيم مكررة (حسب تصميم قاعدة البيانات)
3. في الـ API، يمكن استخدام أي منهما:
   - `?id=2007` → يبحث بـ `charger_id`
   - `?chargerID=AUM-1` → يبحث بـ `chargerID`
   - `?charger_id=AUM-1` → يبحث بـ `chargerID` (fallback)

## مثال من الـ Logs:

من الـ logs السابقة:
```javascript
{
  id: 2016,              // charger_id (رقم)
  chargerID: 'AUM-1',    // chargerID (نص)
  name: 'ION Pro',
  ...
}
```

## في الـ Frontend:

الـ frontend يستخدم `chargerID` (النص) كقيمة افتراضية:
```typescript
// في api.ts
const chargerId = "AUM-1"; // chargerID (نص)

// يحاول البحث بـ:
// 1. ?id=AUM-1 (charger_id) - قد يفشل إذا كان charger_id رقم
// 2. ?chargerID=AUM-1 (chargerID) - ✅ هذا يعمل
// 3. ?charger_id=AUM-1 (chargerID) - fallback
```

## التوصية:

- استخدم **`chargerID`** (النص) في الـ API calls من الـ frontend
- استخدم **`charger_id`** (الرقم) للعلاقات مع جداول أخرى (Foreign Keys)
- في الـ Node-RED flow، يجب دعم كلا الحقلين للبحث
