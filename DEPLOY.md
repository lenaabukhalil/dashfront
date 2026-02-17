# رفع المشروع على السيرفر (AWS EC2)

## هل المشروع جاهز للرفع؟

| البند | الحالة |
|--------|--------|
| بناء الإنتاج (`npm run build`) | ✅ جاهز |
| متغيرات البيئة للإنتاج (`.env`) | ⚠️ يجب تعبئتها قبل البناء |
| مجلد `dist/` بعد البناء | ✅ يُنشأ تلقائياً |
| السيرفر (EC2) | ✅ لديك Instance: Lina-Test |

**ملاحظة:** المشروع Front-end فقط (React + Vite). الـ API يعمل على `dash.evse.cloud` أو أي عنوان تضعه في `VITE_API_BASE_URL`. لا حاجة لرفع الـ Backend على نفس السيرفر إلا إذا أردت ذلك.

---

## الخطوة 1: تجهيز المشروع على جهازك

### 1.1 إنشاء ملف `.env` للإنتاج

في مجلد المشروع (Front-end) أنشئ أو عدّل `.env` بقيم الإنتاج:

```env
VITE_API_BASE_URL=https://dash.evse.cloud/api
VITE_AUTH_API_BASE_URL=https://dash.evse.cloud/api
```

إذا عندك دومين خاص للـ API غيّر الرابط. لا تضع أسراراً حساسة في ملفات يُرفع عليها المشروع.

### 1.2 تثبيت الاعتماديات والبناء

```bash
cd Front-end
npm ci
npm run build
```

بعد النجاح سيظهر مجلد **`dist/`** فيه الملفات الجاهزة (index.html, assets/...).

### 1.3 اختبار البناء محلياً (اختياري)

```bash
npm run preview
```

افتح المتصفح على الرابط الظاهر وتأكد أن التطبيق يعمل ويصل للـ API.

---

## الخطوة 2: الاتصال بالسيرفر (EC2)

### 2.1 صلاحيات مفتاح SSH

على **Windows (PowerShell أو CMD):**

```bash
icacls "lina-testing.pem" /inheritance:r
icacls "lina-testing.pem" /grant:r "%USERNAME%:R"
```

ضع الملف `lina-testing.pem` في مسار تعرفه (مثلاً `C:\Users\User\.ssh\lina-testing.pem`).

### 2.2 الاتصال عبر SSH

```bash
ssh -i "lina-testing.pem" ubuntu@ec2-34-251-92-172.eu-west-1.compute.amazonaws.com
```

عند أول اتصال قد يطلب التأكيد: اكتب `yes`.

---

## الخطوة 3: تجهيز السيرفر (مرة واحدة)

بعد الدخول إلى EC2 نفّذ الأوامر التالية.

### 3.1 تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 تثبيت Nginx (لخدمة الملفات الثابتة)

```bash
sudo apt install -y nginx
```

### 3.3 إنشاء مجلد للمشروع

```bash
sudo mkdir -p /var/www/ion-dashboard
sudo chown ubuntu:ubuntu /var/www/ion-dashboard
```

---

## الخطوة 4: رفع ملفات المشروع

### الطريقة أ: رفع من جهازك عبر SCP

من **جهازك** (خارج جلسة SSH)، من مجلد المشروع:

```bash
scp -i "lina-testing.pem" -r dist/* ubuntu@ec2-34-251-92-172.eu-west-1.compute.amazonaws.com:/var/www/ion-dashboard/
```

استبدل `dist/*` بمسار مجلد `dist` إذا نفذت الأمر من مكان آخر.

### الطريقة ب: استخدام Git على السيرفر

على السيرفر:

```bash
cd /var/www
sudo rm -rf ion-dashboard
sudo git clone <رابط-مستودع-المشروع> ion-dashboard
cd ion-dashboard/Front-end
npm ci
npm run build
sudo mkdir -p /var/www/ion-dashboard-build
sudo cp -r dist/* /var/www/ion-dashboard-build/
```

ثم استخدم `/var/www/ion-dashboard-build` كجذر للموقع في Nginx (انظر الخطوة 5).

---

## الخطوة 5: إعداد Nginx

### 5.1 إنشاء ملف الموقع

```bash
sudo nano /etc/nginx/sites-available/ion-dashboard
```

الصق التالي (عدّل المسار إذا استخدمت الطريقة ب):

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/ion-dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://dash.evse.cloud;
        proxy_http_version 1.1;
        proxy_set_header Host dash.evse.cloud;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

احفظ (في nano: Ctrl+O ثم Enter ثم Ctrl+X).

### 5.2 تفعيل الموقع وإعادة تحميل Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/ion-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## الخطوة 6: فتح المنافذ في Security Group

في **AWS Console** → EC2 → Security Groups → `ion-v3-sg`:

- **Inbound rules:** تأكد من وجود:
  - SSH: Port 22 من عنوانك (أو 0.0.0.0/0 للتجربة فقط).
  - HTTP: Port 80 من 0.0.0.0/0.
  - HTTPS: Port 443 من 0.0.0.0/0 (إذا أضفت شهادة لاحقاً).

احفظ التغييرات.

---

## الخطوة 7: التجربة

افتح في المتصفح:

- `http://ec2-34-251-92-172.eu-west-1.compute.amazonaws.com`

يفترض أن تظهر واجهة الـ Dashboard. إذا كان الـ API على `dash.evse.cloud` والفرونت يرسل الطلبات إلى نفس الدومين أو عبر الـ proxy أعلاه، فالتسجيل والدخول يجب أن يعملا.

---

## تحديث المشروع لاحقاً

1. على جهازك: عدّل الكود ثم `npm run build`.
2. ارفع مجلد `dist` من جديد:

   ```bash
   scp -i "lina-testing.pem" -r dist/* ubuntu@ec2-34-251-92-172.eu-west-1.compute.amazonaws.com:/var/www/ion-dashboard/
   ```

لا حاجة لإعادة تشغيل Nginx بعد استبدال الملفات.

---

## استكشاف الأخطاء

| المشكلة | ما تفعله |
|---------|----------|
| 502 Bad Gateway | تأكد أن Nginx يعمل: `sudo systemctl status nginx` وأن المسار في `root` صحيح. |
| صفحة بيضاء | تأكد أنك رفعت محتويات `dist/` وليس المجلد نفسه، وأن `index.html` موجود في جذر الموقع. |
| الـ API لا يعمل | تأكد من `VITE_API_BASE_URL` عند البناء، ومن إعداد `location /api` في Nginx إذا تستخدم الـ proxy. |
| لا أصل للسيرفر | راجع Security Group (منفذ 80 مفتوح) وأن عنوان الـ Instance لم يتغير (استخدم Elastic IP إن أردت عنواناً ثابتاً). |
