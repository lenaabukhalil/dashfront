# إشعارات الشواحن حسب منظمة المستخدم (Org-Scoped Notifications)

هذا المستند يشرح كيف تعمل نفس نظام الإشعارات الحالي (online/offline للشواحن) لكن **مقتصراً على الشواحن التابعة لمنظمة واحدة فقط — منظمة المستخدم الذي قام بتسجيل الدخول (log in)**.

---

## 1) الوضع الحالي (بدون تحديد منظمة)

- **المصدر:** MQTT يبث أحداث online/offline لجميع الشواحن → Node-RED يرسلها إلى `POST /api/v4/notifications/push`.
- **التخزين:** إما ذاكرة (global) أو جدول `charger_notifications` في ocpp_CSGO.
- **القراءة:** أي مستخدم مسجّل دخوله يطلب `GET /api/v4/notifications?since=...&userId=...` فيرى **كل** الإشعارات من **كل** الشواحن.
- **النتيجة:** مستخدم تابع لمنظمة معينة قد يرى إشعارات شواحن تابعة لمنظمات أخرى.

---

## 2) الهدف (ما تريده)

- **نفس النظام:** نفس الـ endpoints، نفس الـ UI (جرس الإشعارات، قائمة، mark-read، mark-all-read).
- **الفرق:** أن يرى المستخدم **فقط** إشعارات الشواحن التابعة **لمنظمته** (المنظمة المرتبطة بحسابه عند تسجيل الدخول).

الربط في قاعدة ocpp_CSGO:

- **Users** ← لكل مستخدم `organization_id`.
- **Chargers** ← لكل شاحن `location_id`.
- **Locations** ← لكل موقع `organization_id`.

إذن: الشاحن تابع لمنظمة معينة عبر السلسلة **Chargers.location_id → Locations.location_id → Locations.organization_id**. نريد عرض إشعارات فقط عندما `Locations.organization_id = المستخدم.organization_id` للشاحن المعني.

---

## 3) ما الذي يتغير تقنياً؟

| الجزء | التعديل |
|--------|--------|
| **Backend (API)** | عند **GET /api/v4/notifications** (وقراءة من DB): استخراج `organization_id` من المستخدم المسجّل (JWT أو session)، ثم فلترة النتائج بحيث يُرجَع فقط إشعارات الشواحن التابعة لهذه المنظمة. |
| **POST /push** | يبقى كما هو (تخزين كل الإشعارات). الفلترة تتم عند القراءة فقط. |
| **mark-read / mark-all-read** | يبقى كما هو (مرتبط بـ userId). لا حاجة لتغيير؛ المستخدم يعلّم كمقروء فقط الإشعارات التي يراها أصلاً (وهي خاصة بمنظمته بعد الفلترة). |
| **Frontend** | لا تغيير مطلوب في المنطق: يرسل JWT و userId كما هو. الـ API يرجع فقط الإشعارات المسموح بها. |

---

## 4) تنفيذ الفلترة في الـ Backend (Node-RED أو أي API)

### 4.1) استخراج organization_id للمستخدم

- **إن كان الـ API يستقبل JWT في الـ GET:**
  - من الـ token (مثلاً من الـ payload بعد فك التوقيع) استخرج `organization_id` (أو `organizationId`).
  - إن لم يكن موجوداً في الـ JWT، يمكن استدعاء جدول **Users** بمعرف المستخدم (مثلاً من JWT: `user_id`) وأخذ `organization_id` من الصف.
- **إن كان الـ GET لا يمرّر JWT:**
  - يمكن للفرونت إرسال `organizationId` في الـ query (مثلاً `?userId=123&organizationId=5`)، والـ Backend **يجب أن يتحقق** أن المستخدم المسجّل (من JWT أو session) يتبع نفس المنظمة؛ لا تعتمد على الـ organizationId من العميل لوحده لأسباب أمنية. الأفضل: استخراج المستخدم من JWT ثم جلب `organization_id` من DB.

بعد الحصول على `organization_id` (رقم أو سلسلة)، نستخدمه في فلترة الإشعارات.

### 4.2) فلترة الإشعارات عند القراءة من DB

جدول **charger_notifications** فيه عمود `charger_id` فقط. لمعرفة "هل هذا الشاحن تابع لمنظمة المستخدم؟" نربط مع **Chargers** و **Locations**:

```sql
-- استرجاع إشعارات الشواحن التابعة لمنظمة واحدة فقط
SELECT n.id, n.charger_id AS chargerId, n.online, n.message, n.level,
       n.created_at AS timestamp,
       DATE_FORMAT(FROM_UNIXTIME(n.created_at/1000), '%Y-%m-%d %H:%i:%s') AS createdAt,
       (r.read_at IS NOT NULL) AS `read`,
       DATE_FORMAT(FROM_UNIXTIME(r.read_at/1000), '%Y-%m-%d %H:%i:%s') AS readAt
FROM ocpp_CSGO.charger_notifications n
INNER JOIN ocpp_CSGO.Chargers c  ON c.charger_id = n.charger_id
INNER JOIN ocpp_CSGO.Locations l ON l.location_id = c.location_id
LEFT JOIN ocpp_CSGO.user_notification_read r
  ON r.notification_id = n.id AND r.user_id = ?
WHERE l.organization_id = ?
  AND n.created_at >= ?
ORDER BY n.created_at DESC
LIMIT 200;
```

- **المعامل الأول (?):** `user_id` (للمستخدم المسجّل دخوله) — لجدول `user_notification_read` (حالة القراءة).
- **المعامل الثاني (?):** `organization_id` (منظمة المستخدم).
- **المعامل الثالث (?):** `since` (epoch ms)، إن وُجد.

إذا أسماء الجداول أو الأعمدة عندك مختلفة (مثلاً `chargerID` بدل `charger_id`، أو `Locations.organization_id` باسم آخر)، عدّل الـ SQL ليتوافق مع قاعدة بياناتك.

### 4.3) إن كان الـ GET يقرأ من الذاكرة (global list)

إذا الـ API حالياً يقرأ من قائمة في الذاكرة (مثلاً `global.get('chargerNotificationsList')`) ولا يقرأ من DB:

- إما **الانتقال للقراءة من DB** باستخدام الـ SQL أعلاه (مُوصى به حتى لا تفقد الإشعارات عند إعادة التشغيل).
- أو **الحفاظ على القائمة في الذاكرة** لكن عند كل طلب GET:
  - تحصل على قائمة معرّفات الشواحن التابعة للمنظمة (استعلام واحد مثل: `SELECT charger_id FROM Chargers c JOIN Locations l ON c.location_id = l.location_id WHERE l.organization_id = ?`).
  - تفلتر عناصر القائمة بحيث تبقى فقط العناصر التي `chargerId` أو `charger_id` موجود في مجموعة معرّفات الشواحن تلك.

---

## 5) خطوات تنفيذ مختصرة (Checklist)

| # | الخطوة | أين |
|---|--------|-----|
| 1 | التأكد من وجود جداول `charger_notifications` و `user_notification_read` (وربما `Chargers`, `Locations` مع `organization_id`) | DB ocpp_CSGO |
| 2 | في flow الـ **GET /api/v4/notifications**: استخراج المستخدم من JWT (أو من session) والحصول على `organization_id` (من JWT أو من جدول Users). | Node-RED أو Backend |
| 3 | استبدال استعلام "كل الإشعارات" باستعلام يربط `charger_notifications` مع `Chargers` و `Locations` ويضيف شرط `WHERE l.organization_id = ?` مع قيمة منظمة المستخدم. | Node-RED (عقدة SQL) أو Backend |
| 4 | تمرير `userId` (لـ mark-read) و `organization_id` (للفلترة) إلى عقدة الـ SQL أو إلى الدالة التي تبني الـ query. | Node-RED أو Backend |
| 5 | عدم تغيير **POST /push** و **mark-read** و **mark-all-read** من ناحية المنطق؛ التأكد فقط أن الـ GET يرجع صفوفاً مفلترة. | - |
| 6 | في الفرونت: لا حاجة لتغيير استدعاءات الـ API (نفس `fetchChargerNotifications({ since, userId })` مع JWT). الـ API سيرجع تلقائياً الإشعارات المفلترة. | Frontend (اختياري مراجعة فقط) |

---

## 6) ملاحظات إضافية

- **مستخدم بدون منظمة:** إذا `user.organization_id` كان `null` أو فارغاً، يمكن أن تقرر: إما عدم إرجاع أي إشعارات، أو إرجاع إشعارات كل الشواحن (حسب سياسة المنتج). الأغلب: عدم إرجاع شيء أو إرجاع مصفوفة فارغة.
- **أدوار متعددة منظمات:** إذا كان نفس المستخدم يتبع أكثر من منظمة (جدول ربط User–Organization)، يمكن توسيع الفلترة لتصبح: `WHERE l.organization_id IN (قائمة منظمات المستخدم)`.
- **أمان:** لا تعتمد على إرسال `organizationId` من الفرونت فقط؛ استخرج المنظمة من الجلسة/الـ JWT أو من DB بعد التحقق من المستخدم، حتى لا يتمكن أحد من طلب إشعارات منظمة أخرى بتغيير الـ query.

بهذا تحصل على **نفس نظام الإشعارات** لكن **مقتصراً على شواحن منظمة المستخدم المسجّل دخوله فقط**.
