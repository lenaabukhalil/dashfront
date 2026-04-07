# Prompt: صفحات Locations + Connectors + Tariffs بنفس الشكل لموقع Charging Point Operator (CPO)

استخدم هذا البرومبت لبناء نفس شكل صفحات **Locations** و **Connectors** و **Tariffs** في موقع **Charging Point Operator (CPO)**، مع توحيد نماذج الإضافة وأزرار Discard / Add أو Save / Delete.

---

## هيكل الصفحات المشترك (كل من Locations, Connectors, Tariffs)

كل صفحة داخل **DashboardLayout** (سايدبار + هيدر). المحتوى داخل:

```text
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold mb-1">[Page Title]</h1>
    <p className="text-sm text-muted-foreground mb-6">[Short description]</p>
    <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    <div className="text-xs text-muted-foreground pb-4 border-b border-border">[Breadcrumb]</div>
  </div>
  <div className="pt-2">
    {/* Tab content */}
  </div>
</div>
```

**PageTabs:** تبويبات أفقية. التبويب النشط: `border-b-2 border-primary text-primary font-medium`. غير النشط: `border-transparent text-muted-foreground hover:text-foreground`. بين التبويبين: فاصل `h-4 w-px bg-border`. النص `text-sm`, الأزرار `pb-2 border-b-2 -mb-px`.

---

## 1. صفحة Locations — نفس الشكل بالزبط

### التبويبات
- **List** — قائمة المواقع.
- **Locations** — نموذج إضافة/تعديل موقع.

### النصوص
- العنوان: **Locations**
- الوصف: **Manage charging station locations and operations**
- Breadcrumb: **ION Dashboard / Locations** (أو CPO Dashboard / Locations)

### تبويب List
- **كارت واحد:** `Card` مع `border-border`, داخله `CardHeader` + `CardContent`.
- **CardHeader:** `CardTitle className="text-base"` → "Locations".
- **CardContent** `space-y-4`:
  - **بحث:** `Input` مع أيقونة Search على اليسار (`Search` من lucide)، `placeholder="Search by Locations"`, `className="pl-10"`.
  - إن كان التحميل: `Loading...` في منتصف الكارت.
  - إن لا توجد نتائج: **EmptyState** بعنوان "No Locations" ووصف "No locations found."
  - وإلا: **جدول** `table w-full text-sm`:
    - **الرأس:** `thead tr bg-muted/30` — أعمدة: Name, name_ar, Chargers, Payment, Availability, Visibility. كل `th`: `text-left py-3 px-4 font-medium text-muted-foreground`.
    - **الجسم:** كل صف `hover:bg-muted/50`, خلايا `py-3 px-4`. عمود Availability يمكن أن يكون "pills" ملونة (available = أخضر، unavailable = أحمر، coming_soon = كهرماني).
  - **Pagination أسفل الجدول:**
    - سطر: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground`.
    - يسار: "Items per page" + Select (10, 20, 50, 100).
    - يمين: نص النطاق مثل "1-10 of 50" + أزرار: أول صفحة، سابق، تالي، آخر صفحة (ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight)، `variant="ghost" size="sm"`.

### تبويب Locations (نموذج Add/Edit)
- **كارت واحد:** `relative z-10 bg-card rounded-2xl p-6 shadow-sm border border-border`.
- **أعلى النموذج:** صف اختيارات:
  - **Organization** (Select).
  - **Location** (Select) — خيار "--- Add New Location ---" أو قائمة مواقع المنظمة.
- إن كان موقعاً للتعديل: حقل read-only **Location ID**.
- **حقول النموذج** (gridات متتالية):
  - Location Name (EN), Location Name (AR).
  - خريطة لاختيار lat/lng (MapSelector إن وُجد).
  - Num Chargers (Select 1–10), Description (Textarea).
  - Logo upload، Ad URL.
  - Payment Type, Availability, Subscription (Selects).
  - Visible on Map (Switch في صندوق `bg-muted/50 rounded-xl`).
  - قسم **OCPI Information:** ocpi_id, ocpi_name, ocpi_address, ocpi_city, ocpi_postal_code, ocpi_country, ocpi_facility, parking_restrictions, directions EN/AR، OCPI Visible (Switch).
- **أزرار أسفل النموذج:** EntityFormActions — انظر القسم "أزرار كل نموذج Add" أدناه.

---

## 2. صفحة Connectors — نفس الشكل بالزبط

### التبويبات
- **Connectors Status** — قائمة حالة الكونيكتورز.
- **Connectors** — نموذج إضافة/تعديل كونيكتور.

### النصوص
- العنوان: **Connectors**
- الوصف: **Manage connector configurations and settings**
- Breadcrumb: **ION Dashboard / Connectors** (أو CPO Dashboard / Connectors)

### تبويب Connectors Status
- **كارت واحد:** `Card border-border`, `CardHeader` + `CardContent`.
- **CardTitle:** "Connectors".
- **CardContent** `space-y-4`:
  - إن وُجد خطأ: رسالة خطأ في صندوق أحمر + زر Retry.
  - **بحث:** Input مع أيقونة Search، `placeholder="Search by Organization, Location, Charger, Connector..."`, `className="pl-10"`.
  - تحميل / لا نتائج: Loading أو EmptyState "No Connectors", "No connectors found."
  - **جدول:** أعمدة: Organization, Location, Charger, Connector ID, Type, Status. عمود Status: pills ملونة (available/online = أخضر، unavailable/offline = أحمر، faulted/error = كهرماني، charging/busy = أزرق).
  - **Pagination:** نفس نمط Locations (Items per page + نطاق + أزرار أول/سابق/تالي/آخر).

### تبويب Connectors (نموذج Add/Edit)
- **كارت واحد:** `bg-card rounded-2xl p-6 shadow-sm border border-border`.
- **صف الـ selects:** أربعة: Organization, Location, Charger, Connector ("--- New Connector ---" أو قائمة).
- **حقول النموذج** (grid):
  - Connector Type * (Select: Type 1, Type 2, GBT AC, GBT DC, CHAdeMO, CCS1, CCS2).
  - Status * (Select: available, preparing, unavailable, busy, booked, error).
  - Power * (Input).
  - Power Unit, Time Limit (min), PIN.
  - OCPI: ocpi_id, ocpi_standard, ocpi_format, ocpi_power_type, ocpi_max_voltage, ocpi_max_amperage, ocpi_tariff_ids.
  - Switches في صناديق `bg-muted/50 rounded-xl`: Stop Charging at 80%, Available, Enable Connector.
- **أزرار أسفل النموذج:** EntityFormActions.

---

## 3. صفحة Tariffs — نفس الشكل بالزبط

### التبويبات
- تبويب واحد فقط: **Tariffs** (نموذج إضافة/تعديل تعرفة).

### النصوص
- العنوان: **Tariffs**
- الوصف: **Configure pricing and tariffs**
- Breadcrumb: **ION Dashboard / Tariffs / Add Tariffs** (أو CPO Dashboard / Tariffs / Add Tariffs)

### المحتوى (تبويب Tariffs)
- **كارت واحد:** `bg-card rounded-2xl border border-border shadow-sm overflow-hidden`.
- **داخل الكارت:** `form p-6 space-y-6`.
- **صف الـ selects:** أربعة: Organization, Location, Charger, Connector.
- **بلوك "Tariff for this connector":** `rounded-lg border border-border bg-muted/30 p-4` — Select لاختيار تعرفة موجودة أو "+ Add new Tariffs". إن كان جديداً: نص "Fill the form below and save to create a new tariff."
- **حقول النموذج:**
  - Type * (Select: energy, time, fixed), Status (active/inactive).
  - Buy Rate ($/kWh) *, Sell Rate ($/kWh) * (Input number).
  - Transaction Fees ($), Client Percentage (%), Partner Percentage (%).
  - Peak Type (Select: NA, Peak-On_AC, Peak-Off_AC, ...).
- **أزرار أسفل النموذج:** EntityFormActions.

---

## أزرار أسفل كل نموذج Add (نفس الشكل في كل الصفحات)

يجب أن تكون **نفس المكوّن** (EntityFormActions) في: Locations، Chargers، Connectors، Tariffs.

### التخطيط
- حاوية: `flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between`.
- **يسار:** زر **Delete** (يظهر فقط عند **تعديل** سجل موجود).
- **يمين:** **Discard changes** ثم زر الحفظ.

### تفاصيل الأزرار
1. **Delete**
   - يظهر فقط في وضع التعديل (سجل موجود).
   - `variant="destructive"`.
   - عند الضغط يفتح **حوار تأكيد:** عنوان "Delete [entity]?"، وصف "This action cannot be undone."، زر **Keep** (إلغاء)، زر **Delete** (تنفيذ). أثناء الحذف: "Deleting...".

2. **Discard changes**
   - `type="button"`, `variant="outline"`.
   - النص: **Discard changes**.
   - معطّل أثناء الحفظ (`isSubmitting`).
   - عند الضغط: `onDiscard` (إعادة تعيين النموذج أو استرجاع القيم السابقة).

3. **زر الحفظ**
   - `type="submit"`.
   - النص: **Add** (إنشاء جديد) أو **Save changes** (تعديل). أثناء الحفظ: **Saving...**.
   - معطّل عند `isSubmitting` أو عند `disableSaveWhenInvalid` إن وُجد.

**ملخص:** وضع إنشاء = Discard + Add. وضع تعديل = Delete (يسار) + Discard + Save changes (يمين).

---

## الحقول المطلوبة في كل صفحة Add + الأزرار

### Locations (تبويب Locations)
| مطلوب | اختياري (أهم) |
|--------|----------------|
| organization_id (Select) | name_ar, lat, lng, num_chargers, description, logo_url, ad_url, payment_types, availability, subscription, visible_on_map، + كل حقول OCPI |
| name (Input) | |

أزرار: **Discard changes** \| **Add** (أو **Save changes** عند التعديل)؛ **Delete** عند التعديل فقط.

---

### Chargers (تبويب Chargers)
| مطلوب | اختياري |
|--------|----------|
| organization_id, location_id (Selects), name (Input) | type (AC/DC), status, max_session_time, num_connectors, description |

أزرار: نفس EntityFormActions.

---

### Connectors (تبويب Connectors)
| مطلوب | اختياري (أهم) |
|--------|----------------|
| charger_id (Select بعد Org→Location→Charger) | power_unit, time_limit, pin، OCPI، stop_on80, available, enabled |
| connector_type (Select) | |
| power (Input) | |
| status (Select) | |

أزرار: نفس EntityFormActions.

---

### Tariffs (تبويب Tariffs)
| مطلوب | اختياري |
|--------|----------|
| connector_id (Select بعد Org→Location→Charger→Connector) | status, transaction_fees, client_percentage, partner_percentage, peak_type |
| type (Select: energy, time, fixed) | |
| buy_rate (number) | |
| sell_rate (number) | |

أزرار: نفس EntityFormActions.

---

## ملخص سريع لموقع CPO

1. **Locations:** تبويبان (List + Locations). List = كارت + بحث + جدول + pagination. Locations = كارت نموذج (Organization, Location، ثم كل حقول الموقع + OCPI) + أزرار Discard | Add/Save و Delete عند التعديل.
2. **Connectors:** تبويبان (Connectors Status + Connectors). Status = كارت + بحث + جدول كونيكتورز + pagination. Connectors = كارت نموذج (Org→Location→Charger→Connector، ثم نوع، حالة، قدرة، OCPI، Switches) + أزرار Discard | Add/Save و Delete عند التعديل.
3. **Tariffs:** تبويب واحد (Tariffs). كارت نموذج (Org→Location→Charger→Connector، اختيار تعرفة أو إضافة جديدة، ثم type, buy_rate, sell_rate، وباقي الحقول) + أزرار Discard | Add/Save و Delete عند التعديل.
4. **كل نماذج الـ Add:** نفس أزرار الأسفل: **Discard changes** (outline)، **Add** أو **Save changes** (submit)، **Delete** (destructive + حوار تأكيد) عند التعديل فقط.

للتفاصيل الكاملة لحقول كل نموذج (بما فيها الاختيارية والقيم الممكنة)، راجع: `docs/add-forms-fields-reference.md`.
