# حفظ إشعارات الشواحن (Charger Notifications) في قاعدة البيانات ocpp_CSGO

## الوضع الحالي

- **API الإشعارات (Node-RED)**:
  - `POST /api/v4/notifications/push`: يستقبل `{ chargerId, online, message, timestamp }` ويخزّن في **الذاكرة فقط** عبر `global.set('chargerNotificationsList', list)` (حد أقصى 200 سجل).
  - `GET /api/v4/notifications?since=...`: يعيد القائمة من الذاكرة؛ عند إعادة تشغيل Node-RED تُفقد كل الإشعارات.

- **مصدر الإشعارات**: الـ flow "Online Notifications" يستمع لـ MQTT `charger/#` وعند `online` يرسل طلب POST إلى `/api/v4/notifications/push`.

- **الفرونت إند**: يستدعي `fetchChargerNotifications()` من `src/services/api.ts` ويعرض الإشعارات في الـ Header و NotificationContext. لا يهمله من أين تأتي البيانات (ذاكرة أو DB) طالما الـ API يبقى نفسه.

---

## أين تحفظ الإشعارات؟ (بناءً على ERD قاعدة ocpp_CSGO)

بناءً على مخطط الجداول (ERD) في **ocpp_CSGO**:

- جدول **Chargers** يربط الشواحن بـ **Locations** و **Connectors** — إشعارات الحالة (online/offline) مرتبطة مباشرة بـ `charger_id`.
- جدول **triggers_log** يسجّل أحداثاً (مثل `action`, `timestamp`) — نفس فكرة تسجيل الأحداث، ويمكن أن يكون جدول الإشعارات مشابهاً له من ناحية الشكل.
- **Users** و **User_profiles** تحتويان على `firebase_messaging_token` و `device_id` — لاحقاً يمكن ربط إشعارات "مقروءة" أو إرسال push لمستخدمين محددين.

**التوصية:** إضافة جدول جديد **`charger_notifications`** داخل نفس قاعدة **ocpp_CSGO**، مع ربط اختياري بـ **Chargers** عبر `charger_id`، وبنية مشابهة لـ **triggers_log** (event + timestamp). الفرونت إند والـ API يبقىان كما هما؛ فقط مصدر القراءة/الكتابة يصبح هذا الجدول.

---

## 1) إنشاء الجدول في ocpp_CSGO

الجدول التالي يتوافق مع أسماء وأصناف البيانات في ocpp_CSGO (مثل `charger_id` كما في **Chargers** و **Connectors**)، ويحافظ على نفس شكل الـ API (`id`, `chargerId`, `online`, `message`, `level`, `timestamp`).

### الخطوة 1: تنفيذ الـ SQL في MySQL

افتح قاعدة **ocpp_CSGO** (من MySQL Workbench أو أي عميل) ونفّذ:

```sql
-- جدول إشعارات الشواحن (متوافق مع ocpp_CSGO و API الإشعارات)
USE ocpp_CSGO;

CREATE TABLE IF NOT EXISTS charger_notifications (
  id          VARCHAR(64)   NOT NULL PRIMARY KEY COMMENT 'مثل n-{timestamp}-{random}',
  charger_id  VARCHAR(64)   NOT NULL COMMENT 'مرتبط بـ Chargers.charger_id',
  online      TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1=online, 0=offline',
  message     VARCHAR(512)  DEFAULT NULL,
  level       VARCHAR(32)   DEFAULT 'info' COMMENT 'success | info | warning | error',
  created_at  BIGINT        NOT NULL COMMENT 'epoch ms للتوافق مع ?since=',
  INDEX idx_charger_id (charger_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='إشعارات حالة الشواحن (online/offline) من MQTT → API';
```

- **اختياري (ربط رسمي بالـ Chargers):** إذا أردت Foreign Key لضمان أن `charger_id` موجود في `Chargers`:

```sql
ALTER TABLE charger_notifications
  ADD CONSTRAINT fk_charger_notifications_charger
  FOREIGN KEY (charger_id) REFERENCES Chargers(charger_id) ON DELETE CASCADE;
```

- إذا كان نوع `Chargers.charger_id` مختلفاً (مثلاً INT)، غيّر `charger_id` في الجدول أعلاه ليتطابق (مثلاً `INT` مع نفس الـ FK).

### جدول تتبع "قراءة" الإشعار لكل مستخدم (هل اليوزر شاف الإشعار)

لكي تعرف من الـ DB إذا اليوزر شاف الإشعار أو لا، نضيف جدول **ربط** بين المستخدم والإشعار: كل صف = "المستخدم X قرأ الإشعار Y في الوقت Z". نفس الفكرة مثل **triggers_log** (حدث مرتبط بمستخدم/وقت)، ومرتبط بجدول **Users** في الـ ERD.

نفّذ في نفس قاعدة **ocpp_CSGO** (بعد إنشاء `charger_notifications`):

```sql
-- جدول: من قرأ أي إشعار (كل مستخدم له سجل مستقل لكل إشعار)
USE ocpp_CSGO;

CREATE TABLE IF NOT EXISTS user_notification_read (
  user_id         INT          NOT NULL COMMENT 'Users.user_id (PK)',
  notification_id VARCHAR(64)  NOT NULL COMMENT 'charger_notifications.id',
  read_at         BIGINT       NOT NULL COMMENT ,
  PRIMARY KEY (user_id, notification_id),
  INDEX idx_user_id (user_id),
  INDEX idx_notification_id (notification_id),
  CONSTRAINT fk_unr_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_unr_notification FOREIGN KEY (notification_id) REFERENCES charger_notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=;
```

- في الـ ERD جدول **Users** مفتاحه الأساسي هو **`user_id`** وليس `id`، لذلك الـ FK يشير إلى **`Users(user_id)`**. إذا كان عندك اسم جدول مختلف (مثلاً `users` بحرف صغير) استخدمه كما هو في قاعدة البيانات.
- **كيف تعرف من الداتا بيس إذا اليوزر شاف الإشعار؟**
  - استعلام من جدول **`user_notification_read`**: إذا وُجد صف فيه `user_id = X` و `notification_id = Y` فالمستخدم X قد شاف الإشعار Y (وقت المشاهدة في `read_at`).
  - في الـ API: **GET /api/v4/notifications?userId=X** يرجّع كل إشعار مع **read: true/false** و **readAt** (وقت القراءة) بالنسبة للمستخدم X، لأن الـ flow يقرأ من `charger_notifications` مع **LEFT JOIN** على `user_notification_read` لهذا المستخدم.
- **تسجيل "شاف الإشعار":** عند ضغط المستخدم على إشعار (أو "تعليم الكل كمقروء") الفرونت يرسل **POST /api/v4/notifications/mark-read** (أو **mark-all-read**) والـ flow يضيف صفاً في `user_notification_read`، فيصبح الإشعار "مقروء" لهذا المستخدم في الداتا بيس.

بعد تنفيذ الـ SQL يصبح الجدول جاهزاً للاستخدام من Node-RED.

### استخدام DATETIME(3) لحفظ التاريخ الكامل (وليس السنة فقط)

إذا ظهر في العميل أن `created_at` يعرض فقط **2026** أو رقم غريب، فالعمود غالباً ليس من نوع **DATETIME(3)** (مثلاً كان INT أو YEAR). استخدم التعريف التالي عند الإنشاء، أو **عدّل** الجدول الموجود:

```sql
-- إنشاء/تعديل لجدول يحفظ التاريخ الكامل (تاريخ + وقت بدقة ميلي ثانية)
USE ocpp_CSGO;

CREATE TABLE IF NOT EXISTS ocpp_CSGO.charger_notifications (
  id          VARCHAR(64)   NOT NULL PRIMARY KEY,
  charger_id  VARCHAR(64)   NOT NULL,
  online      TINYINT(1)    NOT NULL DEFAULT 1,
  message     VARCHAR(512)  DEFAULT NULL,
  level       VARCHAR(32)   DEFAULT 'info',
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_charger_id (charger_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ocpp_CSGO.user_notification_read (
  user_id         INT          NOT NULL,
  notification_id VARCHAR(64)  NOT NULL,
  read_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, notification_id),
  INDEX idx_user_id (user_id),
  INDEX idx_notification_id (notification_id),
  CONSTRAINT fk_unr_user FOREIGN KEY (user_id) REFERENCES ocpp_CSGO.Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_unr_notification FOREIGN KEY (notification_id) REFERENCES ocpp_CSGO.charger_notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**إذا الجدول موجود بالفعل وعمود `created_at` خطأ (يظهر 2026 فقط):**

```sql
ALTER TABLE ocpp_CSGO.charger_notifications
  MODIFY created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE ocpp_CSGO.user_notification_read
  MODIFY read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
```

ثم استخدم الـ flow الذي يعتمد على **DATETIME(3)** (يحفظ الوقت من السيرفر ولا يمرّر epoch): [notifications-flow-datetime3.json](./notifications-flow-datetime3.json).

---

## 2) ما الذي يُعدَّل في الـ API والـ Flow؟

- **الـ API من منظور الفرونت إند:** نفس الـ endpoints للـ push والـ list، مع إضافة **userId** في طلب القائمة و**read / readAt** في الجواب، وإضافة endpoint جديد **mark-read** (واختياري **mark-all-read**).
- **التعديل في Node-RED:**
  - **POST /api/v4/notifications/push:** كما هو (حفظ في `charger_notifications`).
  - **GET /api/v4/notifications:** يقبل اختيارياً **userId** (مثلاً `?since=0&userId=123`). يُنفّذ استعلام من `charger_notifications` مع **LEFT JOIN** على `user_notification_read` لهذا المستخدم، ويرجع لكل إشعار: **read: true/false** و **readAt** (وقت القراءة إن وُجد).
  - **POST /api/v4/notifications/mark-read:** body مثل `{ "notificationId": "n-...", "userId": 123 }`. يُدخل صفاً في `user_notification_read` (أو يستبدله إذا وُجد) ليعتبر الإشعار "مقروءاً" لهذا المستخدم.
  - (اختياري) **POST /api/v4/notifications/mark-all-read:** body مثل `{ "userId": 123 }`. يضع "مقروء" لكل الإشعارات الحالية لهذا المستخدم.
- **Flow "Online Notifications":** بدون تغيير.

---

## 3) الـ Flow الكامل بعد التعديل (Node-RED)

يوجد flow واحد تُعدّله: **flow الـ API** (استقبال POST و GET للإشعارات). الـ flow الثاني (Online Notifications) يبقى كما هو ويرسل فقط إلى نفس الـ API.

- **ملف جاهز للاستيراد:** [notifications-flow-with-database.json](./notifications-flow-with-database.json) — يحتوي كل العقد والـ wiring والـ config لقاعدة MySQL (تحتاج فقط إدخال كلمة مرور الاتصال في الـ config).

### المكوّنات المطلوبة في الـ Flow المعدّل

| المكوّن | الوظيفة |
|--------|----------|
| **POST /api/v4/notifications/push** | استقبال الطلب (http in). |
| **Store and broadcast notification** | بناء الـ id والبيانات، تحديث الذاكرة (اختياري)، تعبئة `msg.notification` و `msg.payload` للـ response، وإرسال نفس الـ msg إلى فرع الـ DB. |
| **Prepare DB INSERT** | تجهيز `msg.topic` (استعلام INSERT مع ?) و `msg.payload` (مصفوفة القيم) لـ MySQL. |
| **MySQL (insert)** | تنفيذ INSERT في `charger_notifications`. |
| **HTTP response (push)** | إرجاع `{ success: true, id }`. |
| **GET /api/v4/notifications** | استقبال الطلب (http in). |
| **Prepare list query** | استخراج `since` من `req.query` وتجهيز استعلام SELECT مع معامل. |
| **MySQL (select)** | تنفيذ SELECT من `charger_notifications`. |
| **Format list response** | تحويل نتيجة الـ SELECT إلى `{ success: true, data: [ ... ] }` بنفس أسماء الحقول التي يتوقعها الفرونت (chargerId, timestamp، إلخ). |
| **HTTP response (list)** | إرجاع الـ JSON. |

### اتصال الـ nodes (Wires)

- `notif-http-in-push` → `notif-fn-push`
- `notif-fn-push` → `notif-http-res`  
- `notif-fn-push` → `notif-fn-db-insert`
- `notif-fn-db-insert` → `notif-mysql-insert`
- `notif-http-in-list` → `notif-fn-list-query`
- `notif-fn-list-query` → `notif-mysql-select`
- `notif-mysql-select` → `notif-fn-list-format`
- `notif-fn-list-format` → `notif-http-res-list`

---

## 4) كود الـ Functions والـ Flow (لنسخه في Node-RED)

### أ) Function: Store and broadcast notification (معدّل)

يستقبل `msg.payload` من الـ http in (body الطلب). يبني السجل ويضعه في `msg.notification` للفرع الذي يكتب في DB، ويضع رد الـ API في `msg.payload` ويرسل إلى الـ response. يربط أيضاً القائمة في الذاكرة (اختياري) للتوافق مع أي استدعاء يعتمد عليها.

```javascript
const body = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
const chargerId = body.chargerId != null ? String(body.chargerId) : '';
const online = Boolean(body.online);
const message = typeof body.message === 'string' ? body.message : (online ? 'Charger is online' : 'Charger is offline');
const id = 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const timestamp = body.timestamp || Date.now();
const level = online ? 'success' : 'info';

let list = global.get('chargerNotificationsList') || [];
list.push({ id, chargerId, online, message, timestamp, level });
if (list.length > 200) list = list.slice(-200);
global.set('chargerNotificationsList', list);

msg.payload = { success: true, id };
msg.notification = { id, chargerId, online, message, level, timestamp };
msg.statusCode = 200;
return msg;
```

- الخرج يذهب إلى **كل من**: HTTP response (push) و **Prepare DB INSERT**.

### ب) Function: Prepare DB INSERT

يدخل بعد "Store and broadcast notification" ويجهّز استعلام INSERT مع قيم آمنة (parameterized).

```javascript
const n = msg.notification;
if (!n || !n.id) return null;
msg.topic = "INSERT INTO charger_notifications (id, charger_id, online, message, level, created_at) VALUES (?, ?, ?, ?, ?, ?)";
msg.payload = [n.id, n.chargerId || '', n.online ? 1 : 0, n.message || '', n.level || 'info', n.timestamp];
return msg;
```

- الخرج → **MySQL** node (استعلام من `msg.topic` ومعاملات من `msg.payload`).

### ج) Function: Prepare list query (GET) — مع حالة القراءة لكل مستخدم

يستقبل الـ msg من GET /api/v4/notifications (يحتوي `msg.req.query`). يجهّز استعلام SELECT مع `since` و **userId**؛ إذا وُجد **userId** نستخدم **LEFT JOIN** على `user_notification_read` لتعيين **read** و **readAt** لكل إشعار.

```javascript
const q = (msg.req && msg.req.query) || {};
// استخدم 0 عندما since غائب أو غير صالح (وإلا يصبح NaN و الاستعلام قد لا يرجع صفوفاً)
const raw = q.since != null && q.since !== '' ? Number(q.since) : 0;
const since = Number.isFinite(raw) ? raw : 0;
const userId = q.userId != null && q.userId !== '' ? String(q.userId).trim() : null;

if (userId) {
  msg.topic = "SELECT n.id, n.charger_id AS chargerId, n.online, n.message, n.level, n.created_at AS timestamp, (r.read_at IS NOT NULL) AS `read`, r.read_at AS readAt FROM charger_notifications n LEFT JOIN user_notification_read r ON r.notification_id = n.id AND r.user_id = ? WHERE n.created_at >= ? ORDER BY n.created_at DESC LIMIT 200";
  msg.payload = [userId, since];
} else {
  msg.topic = "SELECT id, charger_id AS chargerId, online, message, level, created_at AS timestamp FROM charger_notifications WHERE created_at >= ? ORDER BY created_at DESC LIMIT 200";
  msg.payload = [since];
}
return msg;
```

- الخرج → **MySQL** node للـ SELECT.

### د) Function: Format list response

بعد الـ MySQL، النتيجة في `msg.payload` (مصفوفة صفوف). نُخرج الشكل المتوقع للـ API مع **read** كـ boolean و **readAt** كـ number (للتوافق مع الفرونت).

```javascript
const rows = Array.isArray(msg.payload) ? msg.payload : [];
const data = rows.map(r => ({
  id: r.id,
  chargerId: r.chargerId,
  online: r.online,
  message: r.message,
  level: r.level,
  timestamp: r.timestamp,
  read: r.read === true || r.read === 1,
  readAt: r.readAt != null ? Number(r.readAt) : undefined
}));
msg.payload = { success: true, data };
return msg;
```

- الخرج → **HTTP response (list)**.

### هـ) Endpoint و Function: تعليم إشعار كمقروء (mark-read)

- **HTTP in:** `POST /api/v4/notifications/mark-read`، method: post.
- **Function:** يقرأ من body الطلب `notificationId` و `userId`؛ إذا ناقص يضع `statusCode = 400` ويرسل الـ msg إلى **HTTP response** (عبر عقدة **switch** على `statusCode === 400`). وإلا يجهّز استعلام **INSERT ... ON DUPLICATE KEY UPDATE** في `user_notification_read` ويرسل الـ msg إلى **MySQL**، ثم إلى **Function** تضع رد النجاح ثم إلى **HTTP response**.

**كود Prepare mark-read INSERT (مع تحليل body آمن):**

```javascript
// استخراج body: قد يكون msg.req.body أو msg.payload (كائن أو نص JSON)
let raw = (msg.req && msg.req.body != null) ? msg.req.body : msg.payload;
if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(e) { raw = {}; } }
if (typeof raw !== 'object' || raw === null) raw = {};
const body = raw;

const notificationId = (body.notificationId || body.notification_id || '').toString().trim();
const userId = body.userId != null ? Number(body.userId) : (body.user_id != null ? Number(body.user_id) : NaN);
if (!notificationId || !Number.isFinite(userId)) {
  msg.statusCode = 400;
  msg.payload = { success: false, message: 'notificationId and userId required' };
  return msg;
}
const readAt = Date.now();
msg.topic = "INSERT INTO user_notification_read (user_id, notification_id, read_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)";
msg.payload = [userId, notificationId, readAt];
return msg;
```

العقدة التالية **switch** (قاعدة: `statusCode` يساوي 400) — المخرج الأول للخطأ → response، المخرج الثاني للنجاح → MySQL → ثم function رد النجاح → response.

**مهم (mark-read و mark-all-read):** في Node-RED قد يأتي body الطلب في `msg.req.body` (كائن) أو في `msg.payload` كـ **نص خام** (لم يُحلّل). استخدم **تحليل body موحّد** كما في الكود أدناه حتى يعمل الحفظ حتى لو لم تضف عقدة json.

### و) (اختياري) Endpoint: تعليم كل الإشعارات كمقروءة (mark-all-read)

- **HTTP in:** `POST /api/v4/notifications/mark-all-read`، method: post.
- **Function:** تقرأ **userId** من body (بنفس تحليل body الموحّد أعلاه)، ثم استعلام واحد **INSERT ... SELECT** مع **LIMIT** لتجنّب 504 عند وجود آلاف الإشعارات:

**كود Prepare mark-all-read (مع تحليل body + LIMIT لتجنّب Gateway Timeout):**

```javascript
let raw = (msg.req && msg.req.body != null) ? msg.req.body : msg.payload;
if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(e) { raw = {}; } }
if (typeof raw !== 'object' || raw === null) raw = {};
const body = raw;

const userId = body.userId != null ? Number(body.userId) : (body.user_id != null ? Number(body.user_id) : NaN);
if (!Number.isFinite(userId)) {
  msg.statusCode = 400;
  msg.payload = { success: false, message: 'userId required' };
  return msg;
}
const readAt = Date.now();
// LIMIT 1000 يمنع 504 عندما يكون عدد الإشعارات كبيراً
msg.topic = "INSERT INTO user_notification_read (user_id, notification_id, read_at) SELECT ?, sub.id, ? FROM (SELECT id FROM charger_notifications ORDER BY created_at DESC LIMIT 1000) AS sub ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)";
msg.payload = [userId, readAt];
return msg;
```

- ثم MySQL ثم رد HTTP: `msg.payload = { success: true }; msg.statusCode = 200; return msg;`

---

## 5) إعداد قاعدة البيانات في Node-RED

1. **تثبيت عقدة MySQL:**  
   من قائمة Node-RED: **Manage palette** → **Install** → ابحث عن `node-red-node-mysql` (أو الاسم الموجود في إصدارك) وثبّت.

2. **إعداد اتصال MySQL (ocpp_CSGO):**  
   - اسحب عقدة **mysql** إلى اللوحة.  
   - اضغط عليها واختر **Add new MySQL database**.  
   - أدخل: Host (مثلاً `localhost`)، Port (عادة `3306`)، اسم قاعدة البيانات **ocpp_CSGO**، اسم المستخدم وكلمة المرور.  
   - احفظ وسمِّها مثلاً `ocpp_CSGO`.

3. **عقدة INSERT:**  
   - عقدة **mysql** مرتبطة بنفس الـ database.  
   - في الإعدادات: **Operation** = استخدام الاستعلام من **msg.topic** (إن كان الخيار متاحاً)، أو ضع الاستعلام في العقدة ومرّر المعاملات من `msg.payload` حسب وثائق العقدة المستخدمة.  
   - تأكد أن السلك يأتي من **Prepare DB INSERT** وأن الـ msg يحتوي `topic` و `payload` كما في الكود أعلاه.

4. **عقدة SELECT:**  
   - عقدة **mysql** ثانية (أو نفس العقدة مع استعلام ديناميكي من `msg.topic`).  
   - السلك من **Prepare list query** ثم النتيجة إلى **Format list response**.

(إذا كانت عقدة MySQL في إصدارك تعمل بـ **query من العقدة** فقط، ضع الاستعلام الثابت في العقدة ومرّر `since` في `msg.payload` كمعامل واحد واستخدم placeholder واحد في الاستعلام.)

---

## 6) ملخص التدفق النهائي

1. **إنشاء الجدول:** تنفيذ الـ SQL أعلاه على **ocpp_CSGO**.
2. **تعديل الـ flow في Node-RED:**  
   - POST: http in → Store and broadcast → (نسخة إلى HTTP response، ونسخة إلى Prepare DB INSERT → MySQL insert).  
   - GET: http in → Prepare list query → MySQL select → Format list response → HTTP response.
3. **Flow "Online Notifications":** بدون تغيير؛ يبقى يرسل POST إلى `/api/v4/notifications/push`.
4. **الفرونت إند:** بدون تغيير؛ يستمر باستدعاء نفس الـ API.

بهذا تصبح الإشعارات محفوظة في **ocpp_CSGO.charger_notifications**، وقابلة للاسترجاع حتى بعد إعادة تشغيل Node-RED، مع إمكانية ربط لاحق بـ **Chargers** أو **Users** (مثلاً لفلترة أو لإرسال push عبر `firebase_messaging_token`).

---

## 7) خطوات تنفيذ مثالية (من الصفر)

### الخطوة 1: إنشاء الجداول في MySQL

1. افتح **MySQL Workbench** (أو أي عميل) واتصل بقاعدة **ocpp_CSGO**.
2. نفّذ الـ SQL الموجود في القسم **1)** أعلاه:
   - إنشاء جدول **`charger_notifications`** (إشعارات الشواحن).
   - إنشاء جدول **`user_notification_read`** (من شاف أي إشعار — ربط المستخدم بالإشعار ووقت القراءة).
3. (اختياري) نفّذ جملة `ALTER TABLE ... FOREIGN KEY` لربط `charger_notifications` بـ **Chargers** إذا أردت.

### الخطوة 2: تثبيت عقدة MySQL في Node-RED

1. من Node-RED: **قائمة ☰** → **Manage palette** → **Install**.
2. ابحث عن **node-red-node-mysql** وثبّت.
3. أعد تحميل الواجهة إذا لزم.

### الخطوة 3: استيراد الـ Flow المعدّل

1. الملف الجاهز للاستيراد: **`docs/notifications-flow-with-database.json`** (في نفس المشروع).
2. من Node-RED: **قائمة ☰** → **Import** → **select a file** واختر الملف أعلاه، أو انسخ محتوى الملف والصقه في **Clipboard** ثم **Import**.
3. بعد الاستيراد ستظهر العقد الجديدة في اللوحة. إذا كان عندك بالفعل flow الإشعارات القديم، يمكنك **استبداله** بهذا الـ flow، أو حذف العقد القديمة وربط الـ tab بالعقد الجديدة. المهم أن يكون:
   - **POST** مربوطًا بـ **Store and broadcast notification**، وهذه ترسل إلى **HTTP response** وإلى **Prepare DB INSERT** → **MySQL INSERT**.
   - **GET** مربوطًا بـ **Prepare list query** → **MySQL SELECT** → **Format list response** → **HTTP response (list)**.

### الخطوة 4: إعداد اتصال قاعدة البيانات

1. في الـ flow ستجد عقدة config باسم **ocpp_CSGO** (نوع MySQLdatabase). اضغط عليها (أو من القائمة: **Edit** → **Configuration nodes**).
2. أدخل:
   - **Host:** عنوان خادم MySQL (مثلاً `localhost`).
   - **Port:** عادة `3306`.
   - **Database:** `ocpp_CSGO`.
   - **User** و **Password:** بيانات المستخدم الذي يملك صلاحية INSERT/SELECT على `ocpp_CSGO`.
3. احفظ (Done).

### الخطوة 5: التأكد من عمل عقد MySQL مع الاستعلام الديناميكي

- في **node-red-node-mysql** عادةً يتم أخذ الاستعلام من **msg.topic** والمعاملات من **msg.payload** عندما تترك حقل الاستعلام في إعدادات العقدة فارغاً أو تختار "dynamic". إذا وجدت خياراً مثل **"Get query from msg.topic"** أو **"Message"** ففعّله لعقدتي **INSERT** و **SELECT**.
- إذا كانت نسختك لا تدعم ذلك، ضع الاستعلام ثابتاً في العقدة واستخدم معامل واحد (مثلاً `?`) ومرّر القيم في **msg.payload** من الـ function (كما في الكود أعلاه).

### الخطوة 6: النشر والاختبار

1. اضغط **Deploy** في Node-RED.
2. اختبر **POST** من Postman أو من الـ flow "Online Notifications":
   - `POST http://127.0.0.1:1880/api/v4/notifications/push`  
   - Body (JSON): `{ "chargerId": "test-1", "online": true, "message": "Charger is online" }`
3. تحقق من جدول `charger_notifications` في MySQL أن سجلاً جديداً ظهر.
4. اختبر **GET**:  
   `GET http://127.0.0.1:1880/api/v4/notifications`  
   يجب أن ترى `{ "success": true, "data": [ ... ] }` مع الإشعار المحفوظ.

### ملاحظة عن الـ Flow "Online Notifications"

- **لا تحتاج أي تعديل.** يبقى يرسل POST إلى `/api/v4/notifications/push`؛ الحفظ في DB يتم داخل flow الـ API الذي استوردته أعلاه.

---

## جدول charger_notifications فاضي — ليه مش عم تجي إشعارات؟

إذا الجدول **فاضي** والفرونت يعرض فقط "Welcome" ولا تظهر إشعارات الشواحن، تحقق بالترتيب:

### 1) عقدة MySQL بعد "Prepare DB INSERT" لا تستخدم msg.topic (السبب الأرجح)

عقدة **mysql** اللي بعد "Prepare DB INSERT (BIGINT epoch ms)" **يجب** أن تأخذ الاستعلام من الرسالة وليس من إعداداتها.

**خطوات تحقق فورية:**

1. **في عقدة "Prepare DB INSERT (BIGINT epoch ms)"** تأكد أنك تُمرّر الاستعلام أيضاً في **msg.sql** (بعض النسخ تقرأ منه):
   - أضف سطراً بعد تعيين `msg.topic`:  
     `msg.sql = msg.topic;`  
     أو استخدم:  
     `const sql = "INSERT INTO ..."; msg.topic = sql; msg.sql = sql;`
2. **افتح عقدة MySQL** (دبل-كلك) اللي بعد "Prepare DB INSERT":
   - إذا وجدت حقل **"Query"** أو **"SQL"** أو **"Statement"** وفيه **أي نص** → **امسحه واتركه فاضي**.
   - إذا وجدت قائمة (dropdown) مثل **"Use query from"** أو **"Message"** → اختر **"msg.topic"** أو **"message"**.
3. **احفظ (Done)** ثم **Deploy**.
4. **أضف عقدة Debug** مؤقتاً: من مخرج "Prepare DB INSERT" إلى عقدة **debug** (سمّها مثلاً "Debug INSERT") وعطّل مخرج "Prepare DB INSERT" المؤدي إلى MySQL مؤقتاً، ثم أطلق طلب POST (curl أو من الـ flow). في الـ Debug يجب أن ترى **msg.topic** (نص الـ INSERT) و **msg.payload** (مصفوفة القيم). إذا ظهرا بشكل صحيح، أعد توصيل "Prepare DB INSERT" → MySQL وأزل الـ Debug، وتأكد مرة ثانية أن عقدة MySQL **بدون استعلام ثابت**.
5. **اختبار curl** (على نفس الجهاز اللي فيه Node-RED):  
   `curl -X POST "http://127.0.0.1:1880/api/v4/notifications/push" -H "Content-Type: application/json" -d "{\"chargerId\":\"CH-1\",\"online\":true,\"message\":\"test\"}"`  
   ثم `SELECT * FROM ocpp_CSGO.charger_notifications;` — إذا الجدول بقي فاضي بعد أن رجع الـ curl `{"success":true,...}` فالسبب تقريباً أن عقدة MySQL **لا تزال** تنفّذ استعلاماً ثابتاً من إعداداتها.

### 2) الـ body لا يصل لـ POST /push (msg.payload أو msg.req.body)

لو طلب الـ POST يصل لكن الـ body كـ **نص** أو في **msg.req.body**، دالة "Store and broadcast notification" قد تقرأ `body = {}` وتنشئ إشعاراً ببيانات فاضية؛ أو قد لا تُمرّر بيانات صحيحة لـ "Prepare DB INSERT".

**في عقدة "Store and broadcast notification"** استخدم قراءة الـ body من أكثر من مصدر:

```javascript
// قراءة body من req.body أو payload، وتحويل النص إلى كائن
let body = (msg.req && msg.req.body != null) ? msg.req.body : msg.payload;
if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
if (typeof body !== 'object' || body === null) body = {};
// ثم نفس المنطق: chargerId من body.chargerId، إلخ
const chargerId = body.chargerId != null ? String(body.chargerId) : '';
// ...
```

أو أضف عقدة **json** بعد **POST /notifications/push** وقبل "Store and broadcast" لتحويل `msg.payload` إلى كائن.

### 3) الـ flow "Online Notifications" يرسل لـ 127.0.0.1:1880 والـ API على سيرفر ثاني (مثلاً dash.evse.cloud)

الفرونت على localhost:8080 يوجّه الطلبات عبر **proxy** إلى `VITE_API_PROXY_TARGET` (مثلاً dash.evse.cloud). يعني **GET /api/v4/notifications** يصل إلى **نفس الباك اند** اللي على dash.evse.cloud.

لو flow **"Online Notifications"** (MQTT) يعمل على جهاز أو instance مختلف ويرسل إلى **http://127.0.0.1:1880/api/v4/notifications/push**، فهو يوجّه الطلب لـ **نفس الجهاز 1880** وليس لـ dash.evse.cloud. النتيجة: الـ curl على **https://dash.evse.cloud/api/v4/notifications/push** يخزّن بالداتا بيس، لكن إشعارات الـ MQTT لا تصل لنفس الـ API فلا تُخزَّن ولا تظهر بالفرونت.

**الحل:** في عقدة **"POST to API push"** (في مجموعة Online Notifications) غيّر الـ **URL** من:
- `http://127.0.0.1:1880/api/v4/notifications/push`  
إلى:
- `https://dash.evse.cloud/api/v4/notifications/push`

بهيك لما يوصّل MQTT على `charger/.../online`، الطلب يروح على **نفس الـ API** اللي يخزّن بالداتا بيس ويظهر بالفرونت.

### 3.1) الـ Switch يمرّر فقط عند chargerTopic === "online" — أحداث offline لا تصل للـ API

في flow "Online Notifications"، عقدة **Switch** على `msg.chargerTopic` لها قاعدة واحدة: **eq "online"**. فـ:
- عندما الـ topic مثل `charger/GAM-5/2/online` → `chargerTopic = "online"` → الرسالة تروح على **المخرج 1** → delay → ui-notification + **Prepare push for frontend** → POST للـ API ✅  
- عندما الـ topic مثل `charger/GAM-5/2/serial` (offline) → `chargerTopic = "serial"` → الرسالة تروح على **المخرج 2 (else)**. إذا المخرج 2 **غير موصول** بأي عقدة، الإشعارات الـ offline **لا تصل أبداً لـ "Prepare push for frontend"** فلا تُرسل للـ API ولا تُحفظ بالداتا بيس.

**الحل:** وصّل **المخرج الثاني** من الـ Switch (الـ else) بنفس المسار اللي يجهّز الـ payload ويرسل للـ API. مثلاً:
- من مخرج الـ Switch (المخرج 2) سلك مباشر إلى عقدة **"Prepare push for frontend"** (نفس العقدة اللي المخرج 1 يصلها عبر الـ delay)، أو
- ضع عقدة **join** تجمع مخرج الـ delay (online) ومخرج الـ Switch الثاني (offline) ثم خرج الـ join → "Prepare push for frontend".

بعد الربط، أحداث **offline** (مثل chargerTopic = "serial") كمان تصل لـ "Prepare push for frontend" فتُرسل للـ API وتُحفظ في الداتا بيس وتظهر بالفرونت.

### 4) اختبار سريع: curl لـ POST ثم فحص الجدول

على الجهاز اللي فيه الـ API (أو من جهازك مع استبدال العنوان):

```bash
curl -X POST "http://127.0.0.1:1880/api/v4/notifications/push" -H "Content-Type: application/json" -d "{\"chargerId\":\"CH-1\",\"online\":true,\"message\":\"test\"}"
```

- إذا رجع `{"success":true,"id":"n-..."}` ثم نفّذت `SELECT * FROM charger_notifications` وظهر صف جديد → الـ API والـ INSERT يعملان، والمشكلة من مصدر الإشعارات (MQTT أو عنوان POST في flow "Online Notifications").
- إذا رجع success لكن الجدول بقي فاضي → غالباً عقدة MySQL لا تستخدم msg.topic (راجع 1).
- إذا رجع خطأ أو لا يصل → راجع عنوان الـ API والـ CORS/الشبكة.

### 5) الفرونت: من وين يجيب الإشعارات؟

الفرونت يستدعي `fetchChargerNotifications({ since, userId })` على **نفس الـ API_BASE_URL** (مثلاً `/api` في التطوير فتُوجّه للـ proxy). التأكد:

- `.env` فيه `VITE_API_BASE_URL=/api` و `VITE_API_PROXY_TARGET` يشير إلى الباك اند اللي فيه الـ flow والـ DB (مثلاً https://dash.evse.cloud).
- الـ polling يعمل كل 60 ثانية ويُرسل `userId` من المستخدم المسجّل — لو الـ API يرجع `data: []` لأن الجدول فاضي، الفرونت لن يعرض إشعارات شواحن حتى يمتلئ الجدول.

---

## إشعارات الشواحن لا تظهر في الفرونت اند (الداتا بيس فيها بيانات)

إذا جدول `charger_notifications` فيه سجلات لكن لوحة التحكم لا تعرضها:

1. **الفرونت اند يستدعي أي باك اند؟**  
   في `.env` إذا كان `VITE_API_BASE_URL=https://dash.evse.cloud/api` فالطلبات تروح على سيرفر **dash.evse.cloud** وليس على Node-RED المحلي. إذا الـ flow والـ DB عندك على جهازك أو على سيرفر آخر، لازم الفرونت يوجّه الطلبات له.

2. **الحل للتطوير المحلي (Front-end على localhost:8080 و Node-RED على localhost:1880):**
   - في `.env` ضع:
     - `VITE_API_BASE_URL=/api`
     - `VITE_AUTH_API_BASE_URL=/api`
     - `VITE_API_PROXY_TARGET=http://localhost:1880`
   - بهيك الطلبات (مثل `GET /api/v4/notifications`) تروح على نفس المنفذ (8080) والـ proxy في Vite يوجّهها إلى Node-RED على 1880، فيرجع الإشعارات من الداتا بيس نفسها.

3. **بعد التعديل:** أعد تشغيل `npm run dev` وحدّث الصفحة ثم افتح لوحة الإشعارات — يفترض تظهر إشعارات الشواحن من الجدول.

---

## لا يُحفظ شيء في user_notification_read عند "Mark as read" أو 504 على mark-all-read

### 1) الـ body لا يصل ككائن (لا يُحفظ أي صف)

في Node-RED أحياناً body طلب الـ POST يصل في `msg.payload` كـ **نص خام** وليس ككائن. عندها `body.notificationId` و `body.userId` يصبحان `undefined` والـ INSERT لا يُنفَّذ أو يُرفض.

**الحل:** استخدم في عقدة **Prepare mark-read INSERT** و **Prepare mark-all-read** كود تحليل body الموضّح أعلاه (قسم هـ و و)، الذي يقرأ من `msg.req.body` أو `msg.payload` ويُحوّل النص إلى كائن بـ `JSON.parse` عند الحاجة.

بديل: إضافة عقدة **json** بعد كل من **POST /notifications/mark-read** و **POST /notifications/mark-all-read** بحيث يُحوَّل `msg.payload` إلى كائن قبل الدالة.

### 2) جدول charger_notifications فاضي (السبب الأكثر احتمالاً لـ mark-all-read)

استعلام **mark-all-read** هو:
```sql
INSERT INTO user_notification_read (user_id, notification_id, read_at)
SELECT ?, sub.id, ? FROM (SELECT id FROM charger_notifications ORDER BY created_at DESC LIMIT 1000) AS sub
ON DUPLICATE KEY UPDATE ...
```
المصدر هو **charger_notifications**. إذا كان هذا الجدول **فاضي** (0 صفوف)، الـ SELECT يعيد 0 صفوف فيُدرج **0 صف** في `user_notification_read` — ولا يحدث أي خطأ، فقط الجدول يبقى فاضي.

**ما الذي تفعله:** نفّذ في MySQL:
```sql
SELECT COUNT(*) FROM ocpp_CSGO.charger_notifications;
```
- إذا الناتج **0**: أضف إشعارات أولاً (مثلاً عبر POST /api/v4/notifications/push أو من الـ flow الذي يرسل من MQTT). بعد وجود صفوف في `charger_notifications`، mark-all-read سيبدأ بإدراج صفوف في `user_notification_read`.
- تأكد أيضاً أن عقدة **MySQL** في Node-RED مضبوطة على أخذ الاستعلام من **msg.topic** والمعاملات من **msg.payload** (استعلام ديناميكي)، وليس استعلام ثابت من إعدادات العقدة.

### 3) Foreign Key: user_id أو notification_id غير موجودين

جدول `user_notification_read` فيه:

- `CONSTRAINT fk_unr_user FOREIGN KEY (user_id) REFERENCES Users(user_id)`
- `CONSTRAINT fk_unr_notification FOREIGN KEY (notification_id) REFERENCES charger_notifications(id)`

إذا كان الـ **user_id** الذي يرسله الفرونت (مثلاً من تسجيل الدخول Ion) غير موجود في جدول **Users** في قاعدة **ocpp_CSGO**، أو أن **notification_id** غير موجود في **charger_notifications**، فـ MySQL يرفض الـ INSERT ولا يُضاف أي صف.

**ما الذي تفعله:**

- تأكد أن المستخدم المسجّل دخوله له سجل في **Users** بنفس **user_id** الذي يُرسل في الطلب (مثلاً `user.id` أو `user.user_id` في الفرونت).
- تأكد أن الإشعار المعروض (الذي تضغط عليه "mark read") له **id** موجود في **charger_notifications** (نفس القيم التي يرجعها GET /api/v4/notifications).

للتحقق: نفّذ في MySQL:

```sql
SELECT * FROM ocpp_CSGO.Users WHERE user_id = 1;   -- استبدل 1 بـ user_id الذي يرسله الفرونت
SELECT id FROM ocpp_CSGO.charger_notifications LIMIT 5;
```

### 4) 504 Gateway Time-out على mark-read أو mark-all-read

- **من طرف الـ proxy (Vite):** تم رفع مهلة الـ proxy في المشروع إلى 5 دقائق، والفرونت يحدّ الطلب بـ 30 ثانية ثم يتوقف (والواجهة تُحدَّث فوراً).
- **من طرف السيرفر (dash.evse.cloud):** إذا استمر 504 فغالباً البوابة (nginx أو غيره) أمام Node-RED تقطع الطلب قبل أن يرد Node-RED. **على السيرفر:** ارفع مهلة الـ proxy للـ `/api` (مثلاً `proxy_read_timeout` و `proxy_connect_timeout` في nginx إلى 120 ثانية أو أكثر).
- **لو Node-RED لا يرد أبداً:** إن حدث خطأ في عقدة MySQL (مثلاً FK أو انقطاع الاتصال) وقد لا تُرسل العقدة أي مخرجات، فيبقى طلب الـ HTTP بلا رد → 504. **الحل في Node-RED:** أضف عقدة **Catch** (من قسم "catch" في اللوحة) لتغطية عقد mark-read و mark-all-read، وربط مخرجها بعقدة **HTTP response** ترجع مثلاً `statusCode: 500` و `payload: { success: false, message: "Database error" }`. هكذا أي خطأ يُرجَع كـ 500 بدل أن يبقى الطلب معلقاً.
- **استعلام mark-all-read:** استخدم في **Prepare mark-all-read** الاستعلام الذي يحتوي **LIMIT 1000** (قسم و أعلاه) حتى لا يصبح الـ INSERT بطيئاً جداً.

### 5) charger_notifications فيها بيانات لكن user_notification_read فاضي

إذا **Debug mark-all-read** يظهر الـ topic والـ payload بشكل صحيح وجدول **charger_notifications** فيه صفوف، والجدول **user_notification_read** يبقى فاضي، جرّب التالي:

#### أ) إعداد عقدة MySQL (السبب الأرجح)

عقدة **node-red-node-mysql** إما أن تستخدم استعلاماً ثابتاً من إعداداتها أو استعلاماً من الرسالة (**msg.topic**). إذا كان في إعدادات العقدة حقل **"Query"** أو **"SQL"** وفيه نص، العقدة **تتجاهل msg.topic** وتنفّذ ذلك النص فقط. طلب mark-all-read يرسل الاستعلام الصحيح في msg.topic لكن العقدة لا تستخدمه.

**ما الذي تفعله:**

1. افتح عقدة **MySQL** الخاصة بـ **mark-all-read** (بعد Error? وقبل Mark-all-read response).
2. تأكد أن حقل **Query** أو **SQL** في إعدادات العقدة **فاضي** — حتى تستخدم العقدة **msg.topic** من الرسالة.
3. نفس الشيء لعقدة MySQL الخاصة بـ **mark-read**.
4. احفظ (Done) ثم **Deploy** وأعد تجربة mark-all-read و mark-read.

#### ب) التحقق من جدول Users (Foreign Key)

الجدول **user_notification_read** مربوط بـ **Users(user_id)**. إذا الـ **user_id** المرسل (مثلاً 1) غير موجود في **Users**، الـ INSERT يفشل.

نفّذ في MySQL:

```sql
SELECT * FROM ocpp_CSGO.Users WHERE user_id = 1;
```

(استبدل 1 بـ الـ user_id اللي يرسله الفرونت.) إذا لا يوجد صف: أضف المستخدم في **Users** أو استخدم **user_id** موجود.

#### ج) ماذا يظهر "Debug MySQL result (mark-all-read)"؟

بعد الضغط على "Mark all as read"، راجع الـ Debug:

- إذا **ما ظهرت أي رسالة** من "Debug MySQL result (mark-all-read)": مخرجات عقدة MySQL ما وصلت (غالباً العقدة لا تنفّذ الاستعلام لأن حقل Query في إعداداتها غير فاضي).
- إذا **ظهرت رسالة**: راجع **msg.payload** (نتيجة الاستعلام). إذا ظهر خطأ ستراه أيضاً في "Debug errors".

#### د) خطوات عملية: التأكد من الـ INSERT ثم إصلاح Node-RED

**الخطوة 1 — تشغيل الـ INSERT يدوياً في MySQL (للتأكد أن الجدول يمتلئ):**

افتح MySQL Workbench أو أي عميل، اتصل بـ **ocpp_CSGO**، ونفّذ:

```sql
-- نفس استعلام mark-all-read يدوياً (user_id=1، read_at=الوقت الحالي)
INSERT INTO ocpp_CSGO.user_notification_read (user_id, notification_id, read_at)
SELECT 1, sub.id, UNIX_TIMESTAMP() * 1000
FROM (SELECT id FROM ocpp_CSGO.charger_notifications ORDER BY created_at DESC LIMIT 1000) AS sub
ON DUPLICATE KEY UPDATE read_at = VALUES(read_at);
```

ثم نفّذ:

```sql
SELECT * FROM ocpp_CSGO.user_notification_read;
```

- إذا **ظهرت صفوف**: الجدول والـ FK سليمين، والمشكلة من **عقدة MySQL في Node-RED** (لا تستخدم msg.topic). انتقل للخطوة 2.
- إذا **ظهر خطأ** (مثلاً FK أو syntax): انسخ نص الخطأ وحلّه (مثلاً تأكد أن الجدولين والـ Users موجودين كما في الـ CREATE أعلاه).

**الخطوة 2 — إعداد عقدة MySQL في Node-RED:**

1. في Node-RED، **اضغط دبل-كلك** على عقدة **mysql** اللي بعد "Error?" في فرع **mark-all-read** (قبل "Debug MySQL result" و "Mark-all-read response").
2. في النافذة، ابحث عن حقل اسمه **Query** أو **SQL** أو **استعلام**. لو فيه أي جملة مكتوبة، **امسحها واترك الحقل فاضي**.
3. احفظ (Done) ثم **Deploy**.
4. كرر نفس الشيء لعقدة **mysql** في فرع **mark-read** (بعد "Error?" وقبل "Mark-read response").
5. من الواجهة جرّب مرة ثانية **Mark all as read** ثم تحقق من الجدول:

```sql
SELECT * FROM ocpp_CSGO.user_notification_read;
```

إذا بعد الخطوة 1 ظهرت بيانات يدوياً وبعد الخطوة 2 ما زال الـ flow لا يملأ الجدول، راجع أن العقدة تستخدم **نفس اتصال قاعدة ocpp_CSGO** (Lena's DB Connection) وأن لا يوجد استعلام ثابت في أي مكان في إعدادات العقدة.

#### هـ) حل بديل: عقدة "Pass query to MySQL" قبل عقدة MySQL

إذا الـ Debug يظهر **topic** و **payload** بشكل صحيح والجدول يبقى فاضي، فغالباً عقدة **mysql** لا تنفّذ الاستعلام من الرسالة (إما استعلام ثابت في الإعدادات أو نسخة العقدة تقرأ من خاصية أخرى). يمكنك إجبار تمرير الاستعلام كالتالي:

1. أضف عقدة **function** جديدة بين مخرج **Error?** (المخرج الثاني = مسار النجاح) وعقدة **mysql** في فرع mark-all-read. سمِّها مثلاً **Pass query to MySQL (mark-all-read)**.
2. الصق فيها الكود التالي:

```javascript
// إجبار تمرير الاستعلام: بعض نسخ العقدة تقرأ msg.topic أو msg.sql
const q = (msg.topic || '').replace(/\s+/g, ' ').trim();
if (!q) return null;
msg.topic = q;
msg.sql = q;   // لو العقدة تقرأ من msg.sql
// msg.payload يبقى [userId, readAt]
return msg;
```

3. غيّر التوصيل: مخرج **Error?** (الثاني) → **Pass query to MySQL** → **mysql** (بدل توصيل Error? مباشرة إلى mysql).
4. (اختياري) نفس الفكرة لفرع **mark-read**: أضف function مشابهة قبل عقدة mysql الخاصة بـ mark-read مع نفس المنطق (msg.topic و msg.sql من الرسالة، msg.payload كما هو).
5. **Deploy** ثم جرّب mark-all-read وتحقق من الجدول.

كذلك تأكد في إعدادات عقدة **Lena's DB Connection** أن حقل **Database** هو بالضبط **ocpp_CSGO** (حساس لحالة الأحرف على بعض السيرفرات).

**تنبيه:** في الـ flow تأكد أن مخرج **الخطأ (المخرج 1)** من عقدة **Error?** يوجّه **فقط** إلى عقدة **HTTP response**، وليس إلى الـ Debug أيضاً؛ وإلا قد يُرسل ردّان للعميل. الـ Debug يجب أن يتغذى فقط من **Prepare mark-all-read** (أو من عقدة Pass query إن أضفتها).

---

## التحقق من أن كل شيء زابط (Checklist + اختبار الـ API)

استخدم القائمة التالية للتأكد أن الـ API والـ DB والـ flow متوافقون ويعملون.

### 1) تطابق الداتا بيس مع الـ Flow

| الجدول / الحقل | في الداتا بيس | في الـ Flow |
|----------------|----------------|-------------|
| **charger_notifications** | `created_at DATETIME(3)` | INSERT يستخدم `CURRENT_TIMESTAMP(3)` — ✅ |
| **user_notification_read** | `read_at DATETIME(3)` | mark-read: `CURRENT_TIMESTAMP(3)`؛ mark-all-read: `CURRENT_TIMESTAMP(3)` — ✅ |
| اسم القاعدة | `ocpp_CSGO` | الاستعلامات تستخدم `ocpp_CSGO.charger_notifications` و `ocpp_CSGO.user_notification_read` — ✅ |
| **Users** | `user_id` (PK) | FK في `user_notification_read` → `ocpp_CSGO.Users(user_id)` — ✅ |

تأكد أن الجداول منشأة فعلاً:

```sql
USE ocpp_CSGO;
SHOW TABLES LIKE '%notification%';
SELECT COUNT(*) FROM charger_notifications;
SELECT COUNT(*) FROM user_notification_read;
SELECT * FROM Users WHERE user_id = 1 LIMIT 1;
```

### 2) عقد MySQL في Node-RED

- لكل عقدة **mysql** (push، GET list، mark-read، mark-all-read): افتحها وتأكد أن حقل **Query** أو **SQL** **فاضي** حتى تُستخدم **msg.topic** و **msg.payload** من الرسالة.
- عقدة الاتصال **Lena's DB Connection**: تأكد أن **Database** = `ocpp_CSGO` (بنفس حالة الأحرف).

### 3) اختبار الـ Endpoints يدوياً

استبدل `BASE` بعنوان Node-RED (مثلاً `http://localhost:1880` أو `https://dash.evse.cloud`).

**أ) POST /api/v4/notifications/push**

```bash
curl -X POST "BASE/api/v4/notifications/push" \
  -H "Content-Type: application/json" \
  -d '{"chargerId":"TEST-1","online":true,"message":"Test push"}'
```

المتوقع: `{"success":true,"id":"n-..."}`. ثم في MySQL:

```sql
SELECT * FROM ocpp_CSGO.charger_notifications ORDER BY created_at DESC LIMIT 1;
```

يجب أن ترى الصف الجديد.

**ب) GET /api/v4/notifications**

```bash
curl "BASE/api/v4/notifications?since=0"
curl "BASE/api/v4/notifications?since=0&userId=1"
```

المتوقع: `{"success":true,"data":[...]}` مع عناصر فيها `id`, `chargerId`, `online`, `message`, `level`, `createdAt` (أو `timestamp`)، وإذا وُجد `userId` فـ `read`, `readAt`.

**ج) POST /api/v4/notifications/mark-read**

```bash
# استبدل NOTIFICATION_ID بأحد الـ id من جدول charger_notifications
curl -X POST "BASE/api/v4/notifications/mark-read" \
  -H "Content-Type: application/json" \
  -d '{"notificationId":"NOTIFICATION_ID","userId":1}'
```

المتوقع: `{"success":true,"message":"marked as read",...}`. ثم:

```sql
SELECT * FROM ocpp_CSGO.user_notification_read WHERE user_id = 1;
```

يجب أن يظهر صف للـ `notification_id` المستخدم.

**د) POST /api/v4/notifications/mark-all-read**

```bash
curl -X POST "BASE/api/v4/notifications/mark-all-read" \
  -H "Content-Type: application/json" \
  -d '{"userId":1}'
```

المتوقع: `{"success":true,...}`. ثم:

```sql
SELECT COUNT(*) FROM ocpp_CSGO.user_notification_read WHERE user_id = 1;
```

يفترض أن يكون العدد مساوياً لعدد صفوف `charger_notifications` (أو حدّ 1000).

### 4) الفرونت إند (توافق مع GET)

الـ flow يرجّع **createdAt** (نص من `DATE_FORMAT`). الفرونت يستخدم **timestamp** (epoch ms) في الـ hook لـ `since=` ولبناء الـ id. إذا كان الـ GET يرجّع **createdAt** فقط بدون **timestamp**، إما:

- أن تضيف في عقدة **Format list response** تحويلاً من `createdAt` إلى `timestamp` (epoch ms) وترسل الاثنين، أو  
- أن تستخدم في الفرونت `createdAt` وتُحوّله إلى epoch عند الحاجة.

بهذا يتوافق الـ API مع الداتا بيس والـ flow والفرونت.
