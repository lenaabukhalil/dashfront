# Prompt: صفحة Locations بالكامل — فرونت + خريطة + شكل كل شيء

استخدم هذا البرومبت لبناء **صفحة Locations** بنفس الشكل والسلوك بالضبط (فرونت فقط): التبويبات، القائمة، نموذج الإضافة/التعديل، الخريطة، رفع اللوجو، وأزرار Discard / Add / Save / Delete.

---

## 1. هيكل الصفحة (داخل DashboardLayout)

- غلاف المحتوى: `<div className="space-y-6">`.
- **قسم الرأس:**
  - `<h1 className="text-2xl font-bold mb-1">Locations</h1>`
  - `<p className="text-sm text-muted-foreground mb-6">Manage charging station locations and operations</p>`
- **تبويبات أفقية (PageTabs):**
  - التبويب الأول: `id="list"`, label: **List**
  - التبويب الثاني: `id="manage"`, label: **Locations**
  - النشط: `border-b-2 border-primary text-primary font-medium`
  - غير النشط: `border-transparent text-muted-foreground hover:text-foreground`
  - بين التبويبين: فاصل عمودي `h-4 w-px bg-border`
  - الأزرار: `text-sm pb-2 border-b-2 -mb-px`
- **Breadcrumb:** `<div className="text-xs text-muted-foreground pb-4 border-b border-border">ION Dashboard / Locations</div>`
- **منطقة المحتوى:** `<div className="pt-2">` — تعرض إما **LocationsList** (تبويب List) أو **AddLocationForm** (تبويب Locations).

---

## 2. تبويب List — قائمة المواقع

- **كارت واحد:** `Card` مع `className="border-border"`.
- **CardHeader** `pb-2`: **CardTitle** `className="text-base"` → النص "Locations".
- **CardContent** `className="space-y-4"`:

  **أ) بحث:**
  - حاوية `relative`، بداخلها أيقونة **Search** (lucide) `absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`.
  - **Input** `placeholder="Search by Locations"` و `className="pl-10"` وربط مع state البحث.

  **ب) المحتوى حسب الحالة:**
  - **جاري التحميل:** `<div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>`
  - **لا توجد نتائج:** مكوّن **EmptyState** بعنوان "No Locations" ووصف "No locations found."
  - **يوجد نتائج:** جدول + Pagination.

  **ج) الجدول:**
  - غلاف: `overflow-x-auto rounded-lg`.
  - `<table className="w-full text-sm">`.
  - **الرأس:** `<thead><tr className="bg-muted/30">` مع أعمدة: **Name**, **name_ar**, **Chargers**, **Payment**, **Availability**, **Visibility**. كل `<th className="text-left py-3 px-4 font-medium text-muted-foreground">`.
  - **الجسم:** كل صف `hover:bg-muted/50`، خلايا `py-3 px-4`. عمود **Availability** يعرض كـ "pill" ملون:
    - available → أخضر: `bg-emerald-100 text-emerald-800`
    - unavailable → أحمر: `bg-rose-100 text-rose-800`
    - coming_soon → كهرماني: `bg-amber-100 text-amber-800`
    - النص داخل: `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/5 shadow-sm`.
  - عمود **Visibility:** يعرض 0 أو 1 (من visible_on_map).

  **د) Pagination:**
  - سطر: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground`.
  - يسار: نص "Items per page" (يمكن إخفاؤه على الموبايل: `hidden sm:inline`) + **Select** لاختيار 10 / 20 / 50 / 100.
  - يمين: نص النطاق مثل "1-10 of 50" + أربعة أزرار: أول صفحة (ChevronsLeft)، سابق (ChevronLeft)، تالي (ChevronRight)، آخر صفحة (ChevronsRight). الأزرار: `variant="ghost" size="sm" className="h-8 w-8 p-0"` مع تعطيل عند الحدود.

---

## 3. تبويب Locations — نموذج الإضافة/التعديل

النموذج داخل **كارت واحد:**  
`<div className="relative z-10 bg-card rounded-2xl p-6 shadow-sm border border-border">`  
وداخله `<form onSubmit={...} className="space-y-6">`.

ترتيب الحقول والكتل **بالضبط** كما يلي:

### 3.1 صف الاختيارات الأول
- **Grid:** `grid grid-cols-1 md:grid-cols-2 gap-4`.
- **Organization:** Label "Organization" + Select (قائمة منظمات). Placeholder عند التحميل: "Loading...".
- **Location:** Label "Location" + Select (خيار "--- Add New Location ---" + قائمة مواقع المنظمة). Placeholder عند التحميل: "Loading...". تحته إن كان جاري تحميل التفاصيل: `<p className="text-xs text-muted-foreground">Loading location details...</p>`.

### 3.2 Location ID (في وضع التعديل فقط)
- يظهر فقط إن كان `formData.location_id` موجوداً.
- Label "Location ID (Edit Mode)" + Input `readOnly` يعرض `location_id`.

### 3.3 أسماء الموقع
- **Grid:** `grid grid-cols-1 md:grid-cols-2 gap-4`.
- **Location Name (EN):** Label + Input، placeholder "Enter location name in English".
- **Location Name (AR):** Label + Input، placeholder "أدخل اسم الموقع بالعربية"، `dir="rtl"`.

### 3.4 الخريطة (MapSelector) — شكلها وسلوكها

مكوّن **Location on Map** يجب أن يظهر بنفس الشكل والوظائف:

**أ) التسمية والنص التوجيهي:**
- **Label:** "Location on Map".
- **نص تحته:** "Search only within Jordan" — `text-xs text-muted-foreground mb-1`.

**ب) شريط البحث:**
- حاوية `relative` (مع ref للإغلاق عند النقر خارج القائمة المنسدلة إن وُجدت).
- صف: `flex gap-2`.
  - **Input** بعرض مرن `flex-1`: placeholder "Search"، مع أيقونة على اليمين: إما **Loader2** `animate-spin` أثناء التحميل أو **Search** (lucide). الـ Input: `className="pr-10"`.
  - **زر:** "Search"، `variant="outline"`. عند الضغط أو Enter يبحث عن العنوان أو يطبّق إحداثيات إن كان النص يطابق إحداثيات (مثل 31.95, 35.91).
- إن وُجد خطأ من الـ geocoding: `<p className="text-xs text-destructive mt-1">{error}</p>`.

**ج) حقول Latitude و Longitude:**
- **Grid:** `grid grid-cols-1 sm:grid-cols-2 gap-4` داخل `space-y-2`.
- **Latitude:** Label "Latitude"، Input `type="text"`، placeholder "31.9539"، مربوط بـ `lat`.
- **Longitude:** Label "Longitude"، Input `type="text"`، placeholder "35.9106"، مربوط بـ `lng`.

**د) الخريطة نفسها:**
- غلاف: `relative z-0 w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden`.
- ارتفاع الخريطة متدرج حسب الشاشة:  
  `h-[280px] sm:h-[320px] md:h-[360px] lg:h-[420px]` مع `w-full rounded-xl overflow-hidden`.
- **مكتبة الخريطة:** استخدم **Leaflet** مع **react-leaflet**. المطلوب:
  - **MapContainer:** `center` من الإحداثيات الحالية (أو الافتراضي 31.9539, 35.9106)، `zoom` افتراضي 11، وإن كانت الإحداثيات صالحة استخدم zoom 13. تفعيل `scrollWheelZoom` حسب الإعداد.
  - **TileLayer:** إما OpenStreetMap: `url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"` و attribution من OSM، أو MapTiler إن وُجد مفتاح.
  - **Marker:** في موقع الإحداثيات الحالية. أيقونة الـ marker: دبوس أزرق (مثلاً لون fill #2563eb و stroke #1d4ed8)، مع دائرة بيضاء صغيرة في المنتصف (للمظهر الكلاسيكي "pin"). حجم تقريبي 32×32، و anchor أسفل رأس الدبوس. الـ marker **قابل للسحب** (draggable) عندما النموذج غير معطّل؛ عند انتهاء السحب (dragend) تحديث lat/lng وإظهار toast. **قابل للنقر على الخريطة:** عند النقر على الخريطة تحديث الموقع وإظهار toast (مثلاً "تم تحديد الموقع" مع الإحداثيات).
  - **Popup** على الـ marker: نص "Selected location".
  - عند تغيير الـ center (مثلاً من البحث أو الإحداثيات) تحديث عرض الخريطة بسلاسة (setView مع animate).
- **زر "موقعي" (Locate):** زر صغير في أسفل يمين الخريطة: `absolute bottom-3 right-3 z-[1000]`، يظهر فقط عندما النموذج غير معطّل. أيقونة **Locate** (lucide). عند الضغط: طلب الموقع الحالي من المتصفح (geolocation)، وتحديث lat/lng وإظهار toast. أثناء الطلب يعرض **Loader2** بدل Locate. الـ Button: `variant="outline" size="icon"` و `className` يضم `rounded-lg border bg-background/90 shadow`.

**هـ) تلميح أسفل الخريطة:**
- نص: "Tip: Drag the pin or click on the map to set the location. You can type coordinates (e.g. 31.95, 35.91) or search by address." — `text-xs text-muted-foreground`.

**ملاحظات تقنية للخريطة:**
- استيراد `leaflet/dist/leaflet.css`.
- الـ marker يمكن أن يكون `L.divIcon` مع SVG أزرق أو صورة دبوس جاهزة من Leaflet؛ المهم المظهر: دبوس أزرق مع نقطة بيضاء.
- الإحداثيات الافتراضية: lat 31.9539, lng 35.9106 (الأردن).

### 3.5 Num Chargers و Description
- **Grid:** `grid grid-cols-1 md:grid-cols-2 gap-4`.
- **Num Chargers:** Label "Num Chargers" + Select (خيارات من 1 إلى 10: "1 charger", "2 chargers", ...). Placeholder "Select number of chargers".
- **Description:** Label "Description" + Textarea، placeholder "Enter location description"، `rows={2}`.

### 3.6 رفع اللوجو (LogoUpload)

- **Label:** "Organization Logo".
- **عرض اللوجو:**
  - إن وُجدت صورة (preview أو currentLogoUrl): صندوق `w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted` يعرض الصورة `object-cover`. زر حذف صغير: `absolute -top-2 -right-2`، `variant="destructive" size="icon"`، أيقونة X، `h-6 w-6 rounded-full`، يظهر فقط عندما غير معطّل ووُجد onRemove.
  - إن لم توجد صورة: نفس الصندوق لكن `border-dashed` وبداخله أيقونة **Image** (lucide) `w-8 h-8 text-muted-foreground`.
- **زر الرفع:** Input `type="file" accept="image/*"` مخفي. Label مرتبط به، بداخله زر ظاهر: `variant="outline"`، أيقونة **Upload** + نص "Upload Logo" أو "Change Logo" إن وُجدت صورة، أو "Uploading..." أثناء الرفع. التحقق: نوع الملف image، الحجم حتى 5MB؛ وإلا toast خطأ.
- **نص توجيهي:** "Recommended: Square image, max 5MB (PNG, JPG, or SVG)" — `text-xs text-muted-foreground`.

### 3.7 Ad URL
- Label "Ad URL" + Input، placeholder "https://example.com/ad.png".

### 3.8 Payment, Availability, Subscription
- **Grid:** `grid grid-cols-1 md:grid-cols-3 gap-4`.
- **Payment Type:** Select — ION, Cash, ION & Cash, All.
- **Availability:** Select — Available, Coming Soon, Unavailable, Offline.
- **Subscription:** Select — Free, Premium.

### 3.9 Visible on Map
- صندوق: `flex items-center justify-between p-4 bg-muted/50 rounded-xl`.
- يسار: Label "Visible on Map" (`text-base`) + سطر تحته "Show location on map for users" (`text-sm text-muted-foreground`).
- يمين: **Switch** مربوط بـ visible_on_map.

### 3.10 قسم OCPI Information
- فاصل علوي: `pt-4 border-t border-border`.
- عنوان: `<h3 className="text-lg font-semibold mb-4">OCPI Information</h3>`.
- **Grid:** `grid grid-cols-1 md:grid-cols-2 gap-4`:
  - OCPI ID, OCPI Name.
  - OCPI Address (md:col-span-2).
  - OCPI City, OCPI Postal Code, OCPI Country.
  - OCPI Facility, Parking Restrictions.
  - OCPI Directions (EN), OCPI Directions (AR) — الأخير `dir="rtl"` و placeholder "التوجيهات بالعربية".
- بعد الـ grid: صندوق Switch مثل Visible on Map: "OCPI Visible" مع وصف "Make location visible in OCPI" — `flex items-center justify-between p-4 bg-muted/50 rounded-xl mt-4`.

### 3.11 أزرار الأسفل (EntityFormActions)

- حاوية: `flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between`.
- **يسار:** زر **Delete** (variant destructive) يظهر فقط عند **تعديل** موقع موجود (location_id موجود). عند الضغط يفتح حوار تأكيد: "Delete location?" و "This action cannot be undone." وزر Keep وزر Delete (أحمر). أثناء الحذف النص "Deleting...".
- **يمين:** زر **Discard changes** (variant outline)، ثم زر submit: **Add** (وضع إنشاء) أو **Save changes** (وضع تعديل)، وأثناء الحفظ "Saving...". تعطيل الأزرار أثناء isSubmitting.

---

## 4. الحقول المطلوبة والاختيارية (مرجع سريع)

- **مطلوب:** organization_id (Select), name (Input).
- **باقي الحقول** كلها اختيارية كما في النموذج أعلاه (name_ar, lat, lng, num_chargers, description, logo_url, ad_url, payment_types, availability, subscription, visible_on_map، وكل حقول OCPI). عند التعديل يُرسل أيضاً location_id.

---

## 5. ملخص للمطور

- الصفحة: عنوان + وصف + تبويبا List و Locations + breadcrumb + محتوى حسب التبويب.
- List: كارت + بحث + جدول (Name, name_ar, Chargers, Payment, Availability, Visibility) + Pagination مع Items per page وأزرار أول/سابق/تالي/آخر.
- Locations (النموذج): كارت `rounded-2xl p-6 shadow-sm border`، بداخله نفس ترتيب الأقسام أعلاه، مع **خريطة Leaflet** بنفس الشكل (بحث، lat/lng، marker أزرق قابل للسحب والنقر، زر موقعي، تلميح)، و**رفع لوجو** (صندوق 32×32، زر Upload/Change، حد 5MB)، وقسم OCPI، وأزرار Discard / Add أو Save / Delete عند التعديل.

استخدم هذا الملف كبرومبت كامل لبناء فرونت صفحة Locations بنفس الشكل والخريطة وكل العناصر.
