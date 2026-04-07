# شرح أكواد الفرونت: Utilization، Chargers Online، Active Sessions ورسم Recharts

هذا الملف يشرح **أكواد الفرونت إند** في `GlanceSection.tsx` الخاصة بالبطاقات الثلاث ورسم Recharts — سطراً أو كتلةً حيث يلزم.

---

## 1. البيانات والحالة (State)

كل القيم المعروضة تُخزَّن في state واحد اسمه `data`، وبيانات الرسم في `chartData`.

```tsx
// السطور 49–60: واجهة البيانات والحالة الأولية
interface GlanceData {
  utilization: number;
  chargersOnline: number;
  activeSessions: number;
  newUsers: number;
  sessions: number;
  payments: number;
  faults: number;
  revenue: number;
  tariffAC: number;
  tariffDC: number;
}

const [data, setData] = useState<GlanceData>({
  utilization: 0,
  chargersOnline: 0,
  activeSessions: 0,
  // ... باقي الحقول
});
```

- **`data`**: يملأها استدعاء `fetchDashboardStats()` من الـ API؛ منها نعرض Utilization و Chargers Online والعدد الحالي لـ Active Sessions.
- **`chartData`** (مصفوفة `{ ts, count }[]`): مصدر رسم Active Sessions؛ تُملأ من `fetchActiveSessionsHistory(24)` ومن تحديثات `fetchDashboardStats()`.

---

## 2. جلب الإحصائيات (Utilization، Chargers Online، العدد الحالي)

الدالة `loadData` تجلب الإحصائيات وتحدّث `data` وطرف الرسم:

```tsx
// السطور 205–256
useEffect(() => {
  const loadData = async () => {
    setStatsError(null);
    try {
      const stats = await fetchDashboardStats();   // GET /v4/dashboard/stats
      setData({
        utilization: stats.utilization,
        chargersOnline: stats.chargersOnline,
        activeSessions: stats.activeSessions,
        newUsers: stats.newUsers,
        sessions: stats.sessions,
        payments: stats.payments,
        faults: stats.faults,
        revenue: stats.revenue,
        tariffAC: stats.tariffAC,
        tariffDC: stats.tariffDC,
      });

      const now = Date.now();
      setChartData((prev) => {
        const cutoff = now - HISTORY_WINDOW_MS;   // آخر 24 ساعة
        let next = prev.filter((p) => p.ts >= cutoff);
        const last = next[next.length - 1];
        // إما نضيف نقطة جديدة كل 5 دقائق أو نحدّث آخر نقطة بالعدد الحالي
        if (!last || now - last.ts >= SAMPLE_EVERY_MS) {
          next = [...next, { ts: now, count: stats.activeSessions }];
        } else {
          next = [...next.slice(0, -1), { ts: last.ts, count: stats.activeSessions }];
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      setStatsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setStatsLoading(false);
    }
  };

  loadDataRef.current = loadData;
  loadData();
  const interval = setInterval(loadData, 5000);   // كل 5 ثوانٍ
  return () => clearInterval(interval);
}, []);
```

- **Utilization** و **Chargers Online** يظهران من `data.utilization` و `data.chargersOnline` بعد كل استدعاء ناجح لـ `fetchDashboardStats()`.
- **العدد الحالي لـ Active Sessions** يُحدَّث في `data.activeSessions` وفي آخر نقطة من `chartData` حتى يبقى الرسم محدثاً.

---

## 3. كود بطاقة Utilization (الدائرة + النسبة)

البطاقة الأولى: دائرة SVG تعرض نسبة الاستخدام، والنص في المنتصف.

### 3.1 لون الدائرة حسب النسبة

```tsx
// السطور 255–259
const getUtilizationColor = (value: number) => {
  if (value < 60) return "#5cd65c";   // أخضر
  if (value < 90) return "#ffc800";   // أصفر
  return "#ea5353";                    // أحمر
};
```

### 3.2 هيكل البطاقة والدائرتين SVG

```tsx
// السطور 312–344
<div className="... rounded-xl border ... p-4 ... sm:col-span-1" style={{ minHeight: GAUGE_MIN_H }}>
  <div className="relative w-32 h-32 mb-2">
    <svg className="transform -rotate-90 w-32 h-32">
      {/* الدائرة الخلفية الرمادية */}
      <circle
        cx="64"
        cy="64"
        r="56"
        stroke="hsl(var(--muted))"
        strokeWidth="12"
        fill="none"
      />
      {/* الدائرة الأمامية الملونة حسب النسبة */}
      <circle
        cx="64"
        cy="64"
        r="56"
        stroke={getUtilizationColor(data.utilization)}
        strokeWidth="12"
        fill="none"
        strokeDasharray={`${(data.utilization / 100) * 351.86} ${351.86}`}
        strokeLinecap="round"
      />
    </svg>
    {/* النص في المنتصف */}
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold tabular-nums">{data.utilization.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  </div>
  <p className="text-xs ... text-center">Utilization</p>
</div>
```

**شرح السطور المهمة:**

| الكود | الشرح |
|-------|--------|
| `transform -rotate-90` | تدوير SVG 90° عكس عقارب الساعة حتى يبدأ القوس من الأعلى. |
| `r="56"` | نصف قطر الدائرة؛ المحيط ≈ 2π×56 ≈ 351.86. |
| `strokeDasharray={`${(data.utilization/100)*351.86} ${351.86}`}` | أول قيمة = طول الجزء المرسوم (نسبة من المحيط)، الثانية = طول الفراغ. يعطي شكل الدونات. |
| `data.utilization.toFixed(1)` | عرض النسبة برقم عشري واحد (مثلاً 7.0). |

---

## 4. كود بطاقة Chargers Online (الدائرة + العدد)

نفس فكرة Utilization: دائرتان SVG، لكن القيمة المعروضة هي **عدد** وليس نسبة.

```tsx
// السطور 346–376
<div className="... sm:col-span-1" style={{ minHeight: GAUGE_MIN_H }}>
  <div className="relative w-32 h-32 mb-2">
    <svg className="transform -rotate-90 w-32 h-32">
      <circle cx="64" cy="64" r="56" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
      <circle
        cx="64"
        cy="64"
        r="56"
        stroke={getUtilizationColor((data.chargersOnline / 100) * 100)}
        strokeWidth="12"
        fill="none"
        strokeDasharray={`${(data.chargersOnline / 100) * 351.86} ${351.86}`}
        strokeLinecap="round"
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold tabular-nums">{data.chargersOnline}</span>
      <span className="text-xs text-muted-foreground">units</span>
    </div>
  </div>
  <p className="text-xs ... text-center">Chargers Online</p>
</div>
```

**ملاحظات:**

- `data.chargersOnline` هو **عدد** من الـ API (مثلاً 54).
- لرسم القوس نستخدم **نسبة من 100** كعرض مرئي: `(data.chargersOnline / 100) * 351.86` — إذا كان العدد 54 يُرسم 54% من الدائرة. إذا كان الـ API يعيد نسبة (0–100) فالقسمة على 100 تبقى مناسبة.
- النص في المنتصف يعرض العدد الفعلي + كلمة "units".

---

## 5. تجهيز بيانات الرسم (filledChart) لـ Recharts

قبل الرسم، نحوّل `chartData` إلى مصفوفة منتظمة على فترات 5 دقائق مع احترام نافذة 24 ساعة:

```tsx
// السطور 98–127
const filledChart = useMemo(() => {
  const now = Date.now();
  const windowStart = now - HISTORY_WINDOW_MS;   // 24 ساعة
  const startAligned = Math.floor(windowStart / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;
  const endAligned = Math.floor(now / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;

  const normalized = chartData
    .map((p) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count))
    .filter((p) => p.ts >= startAligned && p.ts <= endAligned)
    .sort((a, b) => a.ts - b.ts);

  const byBucket = new Map<number, number>();
  for (const p of normalized) {
    const bucket = Math.floor(p.ts / SAMPLE_EVERY_MS) * SAMPLE_EVERY_MS;
    byBucket.set(bucket, p.count);
  }

  let lastCount = normalized.length ? normalized[0].count : data.activeSessions;
  const out: ChartDataPoint[] = [];
  for (let t = startAligned; t <= endAligned; t += SAMPLE_EVERY_MS) {
    if (byBucket.has(t)) lastCount = byBucket.get(t)!;
    if (t >= endAligned - SAMPLE_EVERY_MS) lastCount = data.activeSessions;
    out.push({ ts: t, count: lastCount });
  }

  return { data: out, domain: [startAligned, endAligned] as [number, number] };
}, [chartData, data.activeSessions]);
```

- **المخرجات**: `filledChart.data` مصفوفة نقاط كل 5 دقائق، و`filledChart.domain` حدود المحور الأفقي (الوقت).
- **آخر نقطة** تُجبر على `data.activeSessions` حتى يطابق الرسم العدد الحالي من الإحصائيات.

---

## 6. كود رسم Recharts (Active Sessions)

رسم الخط الأحمر و المحورين والتوقيت "Updated".

### 6.1 عنوان البطاقة ووقت التحديث

```tsx
// السطور 382–391
<div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
  <span>Active Sessions</span>
  <span aria-live="polite">
    {serverHistoryLoading
      ? "Updating…"
      : serverHistoryUpdatedAt
        ? `Updated ${formatHms(serverHistoryUpdatedAt)}`
        : "—"}
  </span>
</div>
```

- `formatHms(ts)` يعيد الوقت بصيغة `HH:mm:ss` (مثلاً 15:14:38).
- `serverHistoryUpdatedAt` يُحدَّث عند نجاح `fetchActiveSessionsHistory(24)`.

### 6.2 مكوّنات Recharts

```tsx
// السطور 426–458
<ResponsiveContainer width="100%" height={150}>
  <LineChart data={filledChart.data} aria-hidden>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    <XAxis
      dataKey="ts"
      type="number"
      scale="time"
      domain={filledChart.domain}
      tickFormatter={(v) => formatTime(Number(v))}
      stroke="hsl(var(--muted-foreground))"
      fontSize={10}
      interval="preserveStartEnd"
    />
    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
    <Tooltip
      labelFormatter={(label) => new Date(Number(label)).toLocaleString()}
      contentStyle={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
      }}
    />
    <Line
      type="monotone"
      dataKey="count"
      stroke="hsl(var(--destructive))"
      strokeWidth={2}
      dot={false}
      name="Active Sessions"
      isAnimationActive={false}
    />
  </LineChart>
</ResponsiveContainer>
```

**شرح العناصر:**

| العنصر | الدور |
|--------|--------|
| `ResponsiveContainer` | يجعل الرسم يتكيف مع عرض الحاوية، ارتفاع ثابت 150px. |
| `LineChart data={filledChart.data}` | مصدر النقاط؛ كل عنصر فيه `ts` و `count`. |
| `CartesianGrid` | شبكة خلفية منقطّة. |
| `XAxis dataKey="ts"` | المحور الأفقي من حقل `ts` (وقت بـ epoch ms). |
| `scale="time"` و `domain={filledChart.domain}` | عرض المحور كزمن ضمن آخر 24 ساعة. |
| `tickFormatter={(v) => formatTime(Number(v))}` | تسميات المحور بصيغة HH:mm. |
| `YAxis` | المحور العمودي (عدد الجلسات). |
| `Tooltip` | عند المرور يظهر الوقت والتاريخ وعدد الجلسات. |
| `Line dataKey="count"` | الخط يربط قيم `count`. |
| `stroke="hsl(var(--destructive))"` | لون الخط (أحمر الثيم). |
| `dot={false}` | بدون نقاط على الخط. |
| `isAnimationActive={false}` | بدون حركة عند تحديث البيانات. |

---

## 7. جلب تاريخ الجلسات (للمرة الأولى)

رسم Active Sessions يعتمد أيضاً على تاريخ من الـ API:

```tsx
// السطور 129–203 (مختصر)
useEffect(() => {
  // ...
  const runServerFetch = async () => {
    try {
      setServerHistoryLoading(true);
      const server = await fetchActiveSessionsHistory(24);   // GET .../active-sessions-history?hours=24
      setServerHistoryUpdatedAt(Date.now());
      setHasServerHistoryLoaded(true);
      if (server.length) {
        const cleaned = server
          .map((p) => ({ ts: normalizeTs(p.ts), count: Number(p.count) }))
          .filter(...)
          .filter((p) => p.ts >= cutoff);
        setChartData(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      } else {
        setChartData([]);
      }
    } catch (e) {
      setChartHistoryError(...);
    } finally {
      setServerHistoryLoading(false);
      setHistoryLoading(false);
    }
  };
  runServerFetch();
  return () => { cancelled = true; };
}, []);
```

- **المصدر**: `fetchActiveSessionsHistory(24)` → استجابة مصفوفة `{ ts, count }[]`.
- **النتيجة**: `chartData` تُحدَّث، ثم `filledChart` (useMemo) يعيد حساب النقاط، والرسم يعرض آخر 24 ساعة مع آخر نقطة من `data.activeSessions`.

---

## 8. ملخص تدفق الكود

| العنصر | مصدر القيمة في الكود | أين يُعرض |
|--------|----------------------|-----------|
| **Utilization** | `data.utilization` من `fetchDashboardStats()` | دائرة SVG + `data.utilization.toFixed(1)` و `%` |
| **Chargers Online** | `data.chargersOnline` من `fetchDashboardStats()` | دائرة SVG + `data.chargersOnline` و "units" |
| **العدد الحالي لـ Active Sessions** | `data.activeSessions` من `fetchDashboardStats()` | مدمج في آخر نقطة من الرسم |
| **رسم Active Sessions** | `filledChart.data` المشتق من `chartData` و `data.activeSessions` | Recharts `LineChart` مع `Line` و `XAxis`/`YAxis` و `Tooltip` |
| **Updated HH:mm:ss** | `serverHistoryUpdatedAt` عند نجاح `fetchActiveSessionsHistory(24)` | نص أعلى بطاقة الرسم |

جميع الأكواد المشار إليها موجودة في الملف:  
`src/components/dashboard/GlanceSection.tsx`.
