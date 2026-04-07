# مرجع حقول نماذج الإضافة (Add) — Location, Charger, Connector, Tariff

هذا الملف يلخص **كل الحقول** المستخدمة عند إضافة موقع، شاحن، كونيكتور، أو تعرفة في المشروع، لاستخدامها في ويبسايت آخر.

---

## 1. Location (موقع)

### مطلوب (Required)
| الحقل | النوع | الوصف |
|------|------|--------|
| **organization_id** | string | معرف المنظمة (يُختار من قائمة) |
| **name** | string | اسم الموقع (إنجليزي) — التحقق: `name.trim()` |

### اختياري (Optional) — كل الحقول التالية
| الحقل | النوع | الوصف / القيم |
|------|------|----------------|
| name_ar | string | اسم الموقع بالعربية |
| lat | string | خط العرض (مثال: 31.9539) |
| lng | string | خط الطول (مثال: 35.9106) |
| num_chargers | number \| null | عدد الشواحن (1–10 في القائمة) |
| description | string | وصف الموقع |
| logo_url | string | رابط لوجو الموقع (أو رفع صورة) |
| ad_url | string | رابط إعلان/بانر |
| payment_types | string | "ION" \| "Cash" \| "ION & Cash" \| "All" |
| availability | string | "available" \| "coming_soon" \| "unavailable" \| "offline" |
| subscription | string | "free" \| "premium" |
| visible_on_map | boolean | الظهور على الخريطة |
| ocpi_id | string | OCPI ID |
| ocpi_name | string | OCPI Name |
| ocpi_address | string | عنوان الشارع |
| ocpi_city | string | المدينة |
| ocpi_postal_code | string | الرمز البريدي |
| ocpi_country | string | رمز الدولة (مثل JO) |
| ocpi_visible | boolean | الظهور في OCPI |
| ocpi_facility | string | نوع المنشأة |
| ocpi_parking_restrictions | string | قيود الوقوف |
| ocpi_directions | string | التوجيهات (عربي) |
| ocpi_directions_en | string | التوجيهات (إنجليزي) |

**ملاحظة:** عند **تعديل** موقع موجود يُرسل أيضاً `location_id`.

---

## 2. Charger (شاحن)

### مطلوب (Required)
| الحقل | النوع | الوصف |
|------|------|--------|
| **organization_id** | string | معرف المنظمة (قائمة) |
| **location_id** | string | معرف الموقع (قائمة) |
| **name** | string | اسم الشاحن — التحقق: `name.trim()` |

### اختياري (Optional)
| الحقل | النوع | الوصف / القيم |
|------|------|----------------|
| type | string | "AC" \| "DC" (الافتراضي: "AC") |
| status | string | "online" \| "available" \| "offline" \| "unavailable" \| "error" (الافتراضي: "offline") |
| max_session_time | number | أقصى مدة جلسة بالدقائق (مثل 120) |
| num_connectors | number | عدد الكونيكتورز (مثل 2) |
| description | string | وصف/ملاحظات |

**ملاحظة:** عند **تعديل** شاحن موجود يُرسل `charger_id` (أو chargerId في الـ API).

---

## 3. Connector (كونيكتور)

### مطلوب (Required)
| الحقل | النوع | الوصف |
|------|------|--------|
| **charger_id** | string | معرف الشاحن (يُختار من قائمة بعد Org → Location → Charger) |
| **connector_type** | string | نوع الكونيكتور — من القائمة أدناه |
| **power** | string | القدرة (مثل 22, 60, 120, 180, 240) |
| **status** | string | الحالة — من القائمة أدناه |

**قيم connector_type المقبولة:**  
`Type 1` \| `Type 2` \| `GBT AC` \| `GBT DC` \| `CHAdeMO` \| `CCS1` \| `CCS2`

**قيم status المقبولة:**  
`available` \| `preparing` \| `unavailable` \| `busy` \| `booked` \| `error`

### اختياري (Optional)
| الحقل | النوع | الوصف |
|------|------|--------|
| power_unit | string | وحدة القدرة (مثل KWH, kW) |
| time_limit | number | حد الزمن بالدقائق (مثل 60, 90, 300) |
| pin | string | PIN اختياري |
| ocpi_id | string | مثال: ocpi.1, ocpi.25 |
| ocpi_standard | string | IEC_62196_T1, IEC_62196_T1_COMBO, IEC_62196_T2, IEC_62196_T2_COMBO, CHAdeMO, TESLA_PROPRIETARY, GBT_AC, GBT_DC, CEE_7_7, NEMA_5_20, OTHER |
| ocpi_format | string | "CABLE" \| "SOCKET" |
| ocpi_power_type | string | "AC_1_PHASE" \| "AC_3_PHASE" \| "DC" |
| ocpi_max_voltage | string | مثل 240, 1000 |
| ocpi_max_amperage | string | مثل 30, 250, 300 |
| ocpi_tariff_ids | string | معرفات التعرفة في OCPI |
| stop_on80 | boolean | إيقاف الشحن عند 80% |
| available | boolean | الكونيكتور متاح للجلسات (الافتراضي true) |
| enabled | boolean | تفعيل الكونيكتور (الافتراضي true) |

**ملاحظة:** عند **تعديل** كونيكتور موجود يُرسل `connector_id` (أو connectorId).

---

## 4. Tariff (تعرفة)

### مطلوب (Required)
| الحقل | النوع | الوصف |
|------|------|--------|
| **connector_id** | string | معرف الكونيكتور (يُختار من قائمة بعد Org → Location → Charger → Connector) |
| **type** | string | "energy" \| "time" \| "fixed" |
| **buy_rate** | number | سعر الشراء ($/kWh) |
| **sell_rate** | number | سعر البيع ($/kWh) |

التحقق في الكود: `type` و `buy_rate` و `sell_rate` مطلوبين.

### اختياري (Optional)
| الحقل | النوع | الوصف / القيم |
|------|------|----------------|
| status | string | "active" \| "inactive" (الافتراضي: "active") |
| transaction_fees | number | رسوم المعاملة ($) |
| client_percentage | number | نسبة العميل (%) |
| partner_percentage | number | نسبة الشريك (%) |
| peak_type | string | NA, Peak-On_AC, Peak-Off_AC, Partial-Peak_AC, Partial-Peak-Night_AC, Peak-On_DC, Peak-Off_DC, Partial-Peak_DC, Partial-Peak-Night_DC |

**ملاحظة:** عند **تعديل** تعرفة موجودة يُرسل `tariff_id` (أو tariffId).

---

## ملخص سريع للمطلوب فقط

| الكيان | الحقول الإلزامية |
|--------|-------------------|
| **Location** | organization_id, name |
| **Charger** | organization_id, location_id, name |
| **Connector** | charger_id, connector_type, power, status |
| **Tariff** | connector_id, type, buy_rate, sell_rate |

---

## تسلسل الاختيار في الواجهة

- **Location:** Organization → (Location: جديد أو موجود).
- **Charger:** Organization → Location → (Charger: جديد أو موجود).
- **Connector:** Organization → Location → Charger → (Connector: جديد أو موجود).
- **Tariff:** Organization → Location → Charger → Connector → ثم حقول التعرفة.

يمكنك استخدام هذا الملف كمرجع عند بناء نماذج الإضافة في ويبسايت آخر.
