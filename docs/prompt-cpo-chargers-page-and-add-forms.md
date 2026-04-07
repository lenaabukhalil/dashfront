# Prompt: صفحة Chargers + نماذج Add بنفس الشكل لموقع Charging Point Operator

استخدم هذا البرومبت مع مطوّر أو مع الـ AI لبناء نفس شكل صفحة الشواحن ونماذج الإضافة في موقع **Charging Point Operator (CPO)**.

---

## الجزء 1 — شكل صفحة Chargers بالزبط

**المطلوب:** عمل صفحة "Chargers" بنفس التصميم والسلوك.

### هيكل الصفحة

1. ** داخل DashboardLayout (سايدبار + هيدر)**، المحتوى داخل `<div className="space-y-6">`.

2. **قسم العنوان:**
   - `<h1 className="text-2xl font-bold mb-1">Chargers</h1>`
   - `<p className="text-sm text-muted-foreground mb-6">Monitor charger status and add new chargers</p>`
   - (للـ CPO يمكن تغيير النص فقط، مثلاً: "Manage your chargers" أو ما يناسب.)

3. **تبويبات الصفحة (Page Tabs):**
   - مكوّن تبويبات أفقية: **Status** و **Chargers** (أو "Chargers" فقط إذا ما في Status).
   - التبويب النشط: `border-b-2 border-primary text-primary font-medium`.
   - غير النشط: `border-transparent text-muted-foreground hover:text-foreground`.
   - بين كل تبويبين: فاصل عمودي `h-4 w-px bg-border`.
   - النص: `text-sm`, الأزرار: `pb-2 border-b-2 -mb-px`.

4. **Breadcrumb تحت التبويبات:**
   - `<div className="text-xs text-muted-foreground pb-4 border-b border-border">`
   - النص مثال: `ION Dashboard / Chargers` أو `CPO Dashboard / Chargers`.

5. **المحتوى تحت الـ breadcrumb:**
   - `<div className="pt-2">` يلف المحتوى حسب التبويب النشط.

### تبويب Status (إن وُجد)

- **كروتان** جنب بعض: `grid grid-cols-1 lg:grid-cols-2 gap-6`.
- كل كارت: `bg-card rounded-2xl p-6 shadow-sm border border-border`.
- في كل كارت:
  - شارة علوية: Offline (أحمر) أو Online (أخضر) — `rounded-full`, لون خلفية ونص مناسب (مثلاً `bg-red-50 text-red-700` و `bg-emerald-50 text-emerald-700`).
  - حقل بحث: `Input` مع أيقونة بحث على اليسار، `placeholder="Search"`, `className="pl-8"`.
  - جدول (DataTable): أعمدة مثل Name, ID, Time؛ مع إمكانية البحث/تصفية إن وُجدت.

### تبويب Chargers (نموذج Add/Edit)

- **كارت واحد** يلف النموذج: `bg-card rounded-2xl p-6 shadow-sm border border-border`.
- **النموذج:** `<form className="space-y-6" onSubmit={handleSave}>`.

**صف الاختيارات (Cascading selects):**

- شبكة: `grid grid-cols-1 md:grid-cols-3 gap-4`.
- ثلاثة حقول اختيار (Select):
  1. **Organization** — قائمة منظمات.
  2. **Location** — يعتمد على المنظمة المختارة.
  3. **Charger** — "--- New Charger ---" أو قائمة شواحن الموقع المختار.

**حقول النموذج (شبكة):**

- `grid grid-cols-1 md:grid-cols-2 gap-4`.
- الحقول (بنفس الترتيب والـ labels):
  - **Name** * — Input، مطلوب.
  - **Type** — Select: AC | DC.
  - **Status** — Select: Online, Available, Offline, Unavailable, Error.
  - **Max Session Time (min)** — Input number.
  - **Connectors** — Input number (عدد الكونيكتورز).
  - **Description** — Textarea، rows={3}.

**أزرار النموذج (في أسفل النموذج):**

- يجب أن تكون بنفس شكل "EntityFormActions" (انظر الجزء 2 أدناه):  
  **Discard changes** (outline) | **Add** (أو **Save changes** عند التعديل)، وفي جهة اليسار زر **Delete** عند التعديل فقط.

---

## الجزء 2 — أزرار أسفل كل نموذج Add (Discard / Add أو Save / Delete)

**المطلوب:** في كل صفحة فيها إضافة أو تعديل (Locations, Chargers, Connectors, Tariffs)، أن تكون الأزرار السفلية **بنفس الشكل والسلوك**.

### التخطيط (Layout)

- حاوية واحدة:  
  `flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between`
- **جهة اليسار:** زر **Delete** فقط عند **تعديل** سجل موجود (ليس عند "Add new").
- **جهة اليمين:** زر **Discard changes** ثم زر الحفظ.

### الأزرار بالتفصيل

1. **Delete**
   - يظهر فقط عندما: `mode === "edit"` ووجود سجل (hasExistingEntity) وتم تمرير `onDelete`.
   - `variant="destructive"`.
   - عند الضغط يفتح **حوار تأكيد**: "Delete [entity]?" مع "This action cannot be undone." وزرين: **Keep** (إلغاء) و **Delete** (تنفيذ الحذف). أثناء الحذف النص "Deleting...".

2. **Discard changes**
   - `type="button"`, `variant="outline"`.
   - النص: **"Discard changes"**.
   - يُعطّل أثناء `isSubmitting`.
   - عند الضغط: يستدعي `onDiscard` (إعادة تعيين النموذج أو الرجوع للقيم السابقة).

3. **زر الحفظ (Submit)**
   - `type="submit"`.
   - النص: عند **إنشاء جديد**: **"Add"**؛ عند **تعديل**: **"Save changes"**.
   - أثناء الحفظ: **"Saving..."**.
   - يُعطّل عند `isSubmitting` أو عند `disableSaveWhenInvalid` إن وُجد.

### ملخص المنطق

- **وضع إنشاء (Add):** زر Delete لا يظهر. يظهر: Discard changes + Add.
- **وضع تعديل (Edit):** يظهر Delete (يسار)، Discard changes + Save changes (يمين).

---

## الجزء 3 — الحقول المطلوبة في كل صفحة Add + متى تظهر الأزرار

استخدم الجدول التالي لضمان نفس الحقول والأزرار في موقع الـ CPO.

### Locations (إضافة/تعديل موقع)

| مطلوب | اختياري (أهم الحقول) |
|--------|------------------------|
| organization_id (Select) | name_ar, lat, lng, num_chargers, description, logo_url, ad_url, payment_types, availability, subscription, visible_on_map، + حقول OCPI |
| name (Input) | |

- أزرار: Discard changes | Add (أو Save changes عند التعديل)؛ Delete عند التعديل فقط.

---

### Chargers (إضافة/تعديل شاحن)

| مطلوب | اختياري |
|--------|----------|
| organization_id (Select) | type (AC/DC), status, max_session_time, num_connectors, description |
| location_id (Select) | |
| name (Input) | |

- أزرار: نفس EntityFormActions — Discard | Add/Save؛ Delete عند التعديل.

---

### Connectors (إضافة/تعديل كونيكتور)

| مطلوب | اختياري (أهم) |
|--------|----------------|
| charger_id (Select بعد Org→Location→Charger) | power_unit, time_limit, pin، + OCPI (ocpi_id, ocpi_standard, ocpi_format, ocpi_power_type, ocpi_max_voltage, ocpi_max_amperage, ocpi_tariff_ids), stop_on80, available, enabled |
| connector_type (Select: Type 1, Type 2, GBT AC, GBT DC, CHAdeMO, CCS1, CCS2) | |
| power (Input) | |
| status (Select: available, preparing, unavailable, busy, booked, error) | |

- أزرار: Discard changes | Add / Save changes؛ Delete عند التعديل فقط.

---

### Tariffs (إضافة/تعديل تعرفة)

| مطلوب | اختياري |
|--------|----------|
| connector_id (Select بعد Org→Location→Charger→Connector) | status (active/inactive), transaction_fees, client_percentage, partner_percentage, peak_type |
| type (Select: energy, time, fixed) | |
| buy_rate (number) | |
| sell_rate (number) | |

- أزرار: Discard changes | Add / Save changes؛ Delete عند التعديل فقط.

---

## ملخص سريع للويبسايت CPO

1. **صفحة Chargers:** نفس الهيكل (عنوان، تبويبات، breadcrumb، تبويب Status إن وُجد، تبويب Chargers مع النموذج داخل كارت، وأزرار Discard | Add/Save و Delete عند التعديل).
2. **كل صفحات الـ Add** (Locations, Chargers, Connectors, Tariffs): نفس نمط الكارت (`rounded-2xl p-6 shadow-sm border`)، نفس تسلسل الـ selects (Organization → Location → Charger → Connector حيث ينطبق)، ونفس الحقول المطلوبة والاختيارية كما في الجدول أعلاه.
3. **أزرار أسفل كل نموذج:** دائماً بنفس المكوّن (EntityFormActions): Discard changes (outline) + Add أو Save changes (submit)، و Delete (destructive) مع حوار تأكيد عند التعديل فقط.

للتفاصيل الكاملة لحقول كل نموذج (بما فيها الاختيارية والقيم الممكنة)، راجع الملف: `docs/add-forms-fields-reference.md`.
