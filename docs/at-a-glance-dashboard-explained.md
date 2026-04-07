# شرح قسم "At a glance" في الداشبورد

هذا الملف يوضح كيف تم بناء القسم الظاهر في الصورة (Utilization، Chargers Online، Active Sessions)، ومصادر البيانات، ومصدر الإيموجي في الفرونت إند.

---

## 1. كيف تم بناء القسم (المكونات والتصميم)

### المكون الرئيسي

القسم مبني في **مكوّن واحد**: `src/components/dashboard/GlanceSection.tsx`.

يُعرض هذا المكوّن في صفحة الداشبورد عبر `src/pages/Dashboard.tsx`:

```tsx
<GlanceSection />
```

### البطاقات الثلاث (كما في الصورة)

#### 1) بطاقة Utilization (نسبة الاستخدام)

- **الرسم**: دائرة (donut) مرسومة بـ **SVG** داخل المكوّن نفسه (بدون مكتبة رسوم منفصلة).
- **الفكرة**: دائرتان متحدتان المركز:
  - دائرة خلفية رمادية: `stroke="hsl(var(--muted))"`
  - دائرة أمامية ملونة حسب القيمة: `stroke={getUtilizationColor(data.utilization)}`
  - اللون يتغير حسب النسبة:
    - أقل من 60% → أخضر `#5cd65c`
    - 60–90% → أصفر `#ffc800`
    - 90% فأكثر → أحمر `#ea5353`
- **القيمة**: تُعرض في المنتصف كنص: `data.utilization.toFixed(1)` مع رمز `%`.
- **المصدر**: القيمة تأتي من **API الداشبورد** (انظر القسم 2).

#### 2) بطاقة Chargers Online (الشواحن المتصلة)

- **الرسم**: نفس أسلوب الدائرة (SVG) مع:
  - لون حسب النسبة (معاملة القيمة كنسبة من 100 للمقارنة).
  - النص في المنتصف: العدد `data.chargersOnline` مع كلمة `units`.
- **المصدر**: نفس API الداشبورد (حقل `chargersOnline`).

#### 3) بطاقة Active Sessions (الجلسات النشطة – الرسم البياني)

- **المكتبة**: **Recharts** (`recharts` في `package.json`).
- **الاستخدام**: `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`.
- **البيانات**: مصفوفة نقاط زمنية `{ ts, count }` تُملأ من:
  - API تاريخ الجلسات النشطة (أول تحميل)،
  - وتحديث محلي كل 5 ثوانٍ من إحصائيات الداشبورد.
- **المحور الأفقي**: وقت (صيغة `HH:mm`).
- **المحور العمودي**: عدد الجلسات النشطة.
- **لون الخط**: `hsl(var(--destructive))` (أحمر حسب ثيم التطبيق).
- **تحديث البيانات**: يظهر وقت آخر تحديث في أعلى البطاقة: `Updated HH:mm:ss` من `serverHistoryUpdatedAt`.

### تحديث البيانات

- **إحصائيات الداشبورد** (Utilization، Chargers Online، العدد الحالي للـ Active Sessions): تُجلب عند التحميل ثم **كل 5 ثوانٍ** عبر `setInterval(loadData, 5000)`.
- **تاريخ Active Sessions** (للرسم): يُجلب مرة عند التحميل من API منفصل، مع إمكانية تخزين مؤقت في `localStorage` تحت المفتاح `glance:activeSessions:last24h:v1`.

---

## 2. مصدر البيانات (من وين يجون)

كل القيم المعروضة تأتي من **الباك إند** عبر خدمة `src/services/api.ts`.

### أ) إحصائيات الداشبورد (Utilization، Chargers Online، العدد الحالي لـ Active Sessions)

- **الدالة**: `fetchDashboardStats()`
- **الرابط**:  
  `GET ${API_BASE_URL}/v4/dashboard/stats`
- **مصدر `API_BASE_URL`**:  
  `import.meta.env.VITE_API_BASE_URL` أو في التطوير `/api` أو في الإنتاج `https://dash.evse.cloud/api`
- **الاستخدام في الكود**: النتيجة تُخزّن في state وتُعرض في البطاقات:
  - `stats.utilization` → بطاقة Utilization
  - `stats.chargersOnline` → بطاقة Chargers Online
  - `stats.activeSessions` → الرقم الحالي والرسم (مع تاريخ الجلسات)

### ب) تاريخ الجلسات النشطة (لرسم Active Sessions)

- **الدالة**: `fetchActiveSessionsHistory(hours)`
- **الرابط**:  
  `GET ${API_BASE_URL}/v4/dashboard/active-sessions-history?hours=24`
- **الاستخدام**: مصفوفة نقاط `{ ts, count }` لآخر 24 ساعة (أو حسب المعامل)، تُعرض في الـ LineChart.

### ملخص المصادر

| العنصر في الواجهة | مصدر البيانات | Endpoint |
|-------------------|----------------|----------|
| Utilization %     | `fetchDashboardStats()` | `GET /v4/dashboard/stats` |
| Chargers Online   | `fetchDashboardStats()` | `GET /v4/dashboard/stats` |
| Active Sessions (العدد والرسم) | `fetchDashboardStats()` + `fetchActiveSessionsHistory(24)` | `GET /v4/dashboard/stats` و `GET /v4/dashboard/active-sessions-history?hours=24` |

---

## 3. مصدر الإيموجي المستخدم في الفرونت إند

في **قسم "At a glance" نفسه (الصورة)** لا يوجد أي إيموجي في الواجهة: كل العناصر نصوص وألوان ورسوم (SVG و Recharts).

الإيموجي المستخدم في المشروع يظهر فقط داخل **رسائل التصحيح (console)** في الكود، وليس كعناصر واجهة للمستخدم. أمثلة من المشروع:

- في `src/services/api.ts`: `🔍`, `✅`, `❌`, `⚠️`, `🚀`, `📍`, `🔗`
- في `src/components/dashboard/OperatorDashboard.tsx`: `📊`, `❌`
- في `src/components/monitoring/StatusDashboard.tsx`: `📊`
- في `src/features/chargers/hooks/useChargerForm.ts`: `📋`, `✅`, `⚠️`, `❌`, `📍`, `🔌`

**مصدر هذه الإيموجي**:  
**Unicode** العادي. المتصفحات والأنظمة تعرضها كأحرف Unicode قياسية (مثل U+1F4CA لـ 📊)، ولا يوجد مكتبة أو خط إيموجي منفصل في المشروع لهذا الاستخدام؛ الإيموجي مكتوبة مباشرة في النص داخل `console.log` / `console.warn` / `console.error`.

إذا أردت استخدام إيموجي **في الواجهة** (مثلاً بجانب عناوين أو رسائل): يمكنك نفس الأحرف Unicode في النص، أو استخدام أيقونات من مكتبة مثل **lucide-react** (المستخدمة أصلاً في المشروع) لعناصر واجهة بدلاً من الإيموجي.

---

## 4. الملفات ذات الصلة

| الملف | الدور |
|-------|--------|
| `src/components/dashboard/GlanceSection.tsx` | المكوّن الكامل لـ "At a glance" (الدوائر + الرسم + البطاقات الإضافية) |
| `src/components/shared/GlanceCard.tsx` | بطاقة عامة للأرقام (New users، Sessions، إلخ) تحت القسم الرئيسي |
| `src/pages/Dashboard.tsx` | صفحة الداشبورد التي تعرض `GlanceSection` |
| `src/services/api.ts` | `fetchDashboardStats`, `fetchActiveSessionsHistory` وتعريف الـ API base URL |
| `package.json` | اعتماد `recharts` للرسم البياني |

---

تم إعداد هذا الشرح بناءً على الكود الحالي في المشروع.
