# كيف يعمل البحث على الخريطة — شرح لنقله إلى CPO

هذا الملف يشرح **بالضبط** آلية البحث في مكوّن الخريطة (MapSelector) حتى يمكن نسخها إلى مشروع Charging Point Operator (CPO).

---

## 1. نظرة عامة

البحث يعمل بطريقتين:

1. **إدخال إحداثيات مباشرة** — إذا كتب المستخدم رقمين (مثل `31.95, 35.91` أو `31.95 35.91`) يتم تحليلهم كـ lat, lng وتحديث الخريطة فوراً بدون أي طلب API.
2. **بحث بعنوان أو مكان** — يتم إرسال النص إلى خدمة Geocoding (Photon ثم Nominatim كاحتياطي)، والنتائج تُصفى لتبقى **داخل الأردن فقط**، ويُطبَّق **أول اقتراح** تلقائياً على الخريطة (بدون قائمة منسدلة في الواجهة الحالية).

---

## 2. الملفات المستخدمة

| الملف | الدور |
|-------|------|
| `src/lib/geocoding.ts` | تحليل إحداثيات من النص (`parseCoordinates`, `parseCoord`) |
| `src/lib/arabic.ts` | تطبيع النص العربي للبحث (`normalizeArabic`) |
| `src/hooks/useGeocodingSearch.ts` | منطق البحث: استدعاء APIs، تصفية الأردن، اقتراحات |
| `src/components/organizations/MapSelector.tsx` | واجهة المستخدم: حقل بحث، lat/lng، خريطة، ربط مع الـ hook |

---

## 3. تحليل الإحداثيات (بدون API)

**الملف:** `src/lib/geocoding.ts`

- **`parseCoordinates(input: string): [number, number] | null`**
  - يأخذ نصاً مثل `"31.95, 35.91"` أو `"31.95 35.91"` (يفصل بين الأرقام مسافة أو فاصلة).
  - يجزّئ النص بـ `split(/[\s,]+/)` ويأخذ أول عددين كـ lat و lng.
  - يتحقق: أن يكونا أرقاماً صحيحة، و lat بين -90 و 90، و lng بين -180 و 180.
  - يرجع `[lat, lng]` أو `null` إذا فشل التحليل.

- **`parseCoord(s: string): number | null`**
  - يحوّل سلسلة إلى رقم، ويرجع `null` إذا لم يكن رقماً صالحاً.

**الاستخدام في الخريطة:** عند كل تغيير في حقل البحث، إن كان النص يتحول إلى إحداثيات صالحة، يتم تحديث الموقع على الخريطة مباشرة دون استدعاء أي خدمة خارجية.

---

## 4. تطبيع النص العربي

**الملف:** `src/lib/arabic.ts`

- **`normalizeArabic(text: string): string`**
  - يزيل التاتوييل (ـ)، وحركات التشكيل، ويوحّد همزات الألف (أ، إ، آ → ا)، ويضغط المسافات.
  - يُستدعى على نص البحث قبل إرساله إلى الـ API لتحسين النتائج للعناوين العربية.

---

## 5. الـ Hook: useGeocodingSearch

**الملف:** `src/hooks/useGeocodingSearch.ts`

### الثوابت

- **Photon API:** `https://photon.komoot.io/api/`
- **Nominatim (احتياطي):** `https://nominatim.openstreetmap.org/search`
- **Debounce:** 400 ms عند الكتابة (بحث مؤجل).
- **عدد النتائج المعروضة:** 10 (DISPLAY_LIMIT).
- **مركز الأردن (للتحيز):** lat 31.95, lon 35.91.
- **Viewbox الأردن (لـ Nominatim):** `"34.96,33.37,39.30,29.19"` (يحد البحث داخل حدود الأردن).

### تدفق البحث `runSearch(q)`

1. **تطبيع:** `normalizeArabic(q).trim()` — إذا فارغ، يُمسح الاقتراحات والخطأ.
2. **إلغاء الطلب السابق** عبر `AbortController`.
3. **المرحلة 1 — Photon:**
   - بناء الرابط: `https://photon.komoot.io/api/?q=...&limit=15&lat=31.95&lon=35.91` (إضافة lat/lon يرجّح النتائج قرب الأردن).
   - استدعاء `fetch` مع `signal` للإلغاء.
   - تحويل الاستجابة عبر `parsePhotonToSuggestions`: كل عنصر من `features` فيه `geometry.coordinates` [lon, lat] و `properties` (name, street, city, country, countrycode، إلخ). البناء: `{ lat, lon, display_name, address }`.
   - **تصفية للأردن فقط:** `filterToJordanOnly`: الإبقاء على النتائج التي `country_code === "jo"` أو `country === "jordan"` أو النص يحتوي أردن/الاردن.
4. **إذا لم توجد نتائج والاستعلام لا يحتوي "jordan":**
   - إعادة محاولة Photon مع استعلام: `"${normalized}, Amman, Jordan"`.
   - تصفية الأردن مرة أخرى.
5. **إذا ما زالت النتائج فارغة — Nominatim (احتياطي):**
   - `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=10&addressdetails=1&viewbox=34.96,33.37,39.30,29.19&bounded=1`
   - `User-Agent` مطلوب (مثلاً `"IONDashboard/1.0 (Location search)"`).
   - تحويل الاستجابة عبر `parseNominatimToSuggestions`: كل عنصر فيه `lat`, `lon`, `display_name`, `address`.
   - تصفية الأردن مرة أخرى.
6. **بعد جمع النتائج:**
   - ترتيب بحيث نتائج الأردن (country_code jo) أولاً: `prioritizeJordan`.
   - أخذ أول 10: `prioritizeJordan(data).slice(0, DISPLAY_LIMIT)`.
   - حفظ النتائج في `suggestions` وفتح القائمة إن وُجدت واجهة (في المشروع الحالي لا تُعرض قائمة؛ يُستخدم أول اقتراح فقط).
7. **إذا لم توجد أي نتيجة:** تعيين رسالة خطأ بالعربية: "لا توجد نتائج داخل الأردن. جرّب عبارة أخرى أو أدخل إحداثيات (مثلاً 31.95, 35.91)."
8. **معالجة الأخطاء:** إلغاء الطلب (AbortError) لا يظهر خطأ. أخطاء الشبكة أو 429 تُعرض كـ "Service temporarily unavailable. Please try again."

### ما يرجعه الـ Hook

- `query`, `setQuery` — نص البحث.
- `search(q, immediate)` — `immediate === false`: بحث مؤجل (debounce 400 ms). `immediate === true`: بحث فوري.
- `suggestions` — مصفوفة `{ lat, lon, display_name, address? }`.
- `showDropdown`, `setShowDropdown`, `clearSuggestions`, `selectSuggestion(item)`.
- `loading`, `error`, `phase`, ورسائل إضافية إن وُجدت.

---

## 6. مكوّن MapSelector — الربط مع الواجهة

**الملف:** `src/components/organizations/MapSelector.tsx`

### عند تغيير حقل البحث (onChange)

```ts
handleSearchInputChange(value) {
  setInputValue(value);
  setQuery(value);
  const coords = parseCoordinates(value);
  if (coords) {
    onLocationChange(String(coords[0]), String(coords[1]));  // تحديث الخريطة فوراً
    clearSuggestions();
    return;
  }
  search(value, false);   // بحث مؤجل 400 ms
}
```

- إذا كان النص إحداثيات صالحة → تحديث الموقع على الخريطة مباشرة ومسح الاقتراحات.
- وإلا → تشغيل البحث المؤجل (لا يطلب API مع كل حرف).

### عند الضغط على زر Search أو Enter

```ts
handleSearchSubmit() {
  if (!trimmed) { toast error; return; }
  if (parseCoordinates(trimmed)) return;   // لو إحداثيات، تم التعامل معها في onChange
  search(trimmed, true);   // بحث فوري
}
```

### عند وصول اقتراحات من الـ API

في المشروع الحالي **لا تُعرض قائمة منسدلة**. بدلاً من ذلك:

```ts
useEffect(() => {
  if (suggestions.length === 0) return;
  const first = suggestions[0];
  selectSuggestion(first);   // يطبّق أول نتيجة: onLocationSelect(first.lat, first.lon)
}, [suggestions, selectSuggestion]);
```

أي أن **أول نتيجة بحث داخل الأردن تُطبَّق تلقائياً** على الخريطة (تحديث lat/lng والـ marker).

### إغلاق القائمة عند النقر خارجها

يوجد `dropdownRef` وحدث `click` على المستند لإغلاق القائمة لو كانت معروضة. في النسخة الحالية لا تُرسم قائمة في الـ UI، لكن الـ hook جاهز لعرضها لو أضفتها في CPO.

---

## 7. ملخص لنقل البحث إلى CPO

1. **نسخ الملفات (أو منطقها):**
   - `src/lib/geocoding.ts` — على الأقل `parseCoordinates` و `parseCoord`.
   - `src/lib/arabic.ts` — `normalizeArabic` إذا ستدعم بحثاً عربياً.
   - `src/hooks/useGeocodingSearch.ts` — كاملاً (Photon → fallback Nominatim، تصفية الأردن، debounce، إرجاع suggestions و loading و error).

2. **في واجهة الخريطة (مثل MapSelector):**
   - حقل بحث: عند `onChange` إذا النص إحداثيات → `parseCoordinates` ثم `onLocationChange(lat, lng)`.
   - وإلا → استدعاء `search(value, false)` (مع debounce).
   - عند زر Search أو Enter → استدعاء `search(trimmed, true)` إن لم يكن النص إحداثيات.
   - عند وصول `suggestions`: إما تطبيق أول نتيجة تلقائياً (كما هو الآن)، أو عرض قائمة منسدلة وتطبيق النتيجة عند الاختيار.

3. **الالتزامات مع الخدمات الخارجية:**
   - Photon: لا يحتاج مفتاح API؛ استخدم نفس الرابط مع `q`, `limit`, `lat`, `lon`.
   - Nominatim: يلزم `User-Agent` واضح ويفضل عدم الإكثار من الطلبات (مثلاً بحث عند Enter أو زر فقط للطلبات الفورية).

4. **لو CPO لبلد غير الأردن:** استبدل `JORDAN_LAT/LON`, `JORDAN_VIEWBOX`, وشرط `filterToJordanOnly` ببلدك (أو اجعل البلد إعداداً في الـ hook).

بهذا يكون لديك نفس سلوك البحث على الخريطة في CPO: إحداثيات مباشرة + بحث بعنوان مع حصر النتائج (هنا الأردن) وتطبيق أول نتيجة.
