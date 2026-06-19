# راهنمای سریع فارسی — KabelWerkstatt

این پروژه از صفر ساخته شده و کپی هیچ ریپازیتوری دیگری نیست. نام پروژه آلمانی است، تم نارنجی دارد و نویسنده داخل فایل‌ها **Amir Mobasheraghdam** ثبت شده است.

## اجرای سریع

اگر Node.js نصب داری:

```bash
npm start
```

بعد مرورگر را باز کن:

```text
http://localhost:4173
```

بدون Node.js هم می‌توانی فایل `index.html` را مستقیم در مرورگر باز کنی.

## تست

```bash
npm test
```

## ساخت نسخه نهایی

```bash
npm run build
```

خروجی داخل پوشه `dist/` ساخته می‌شود.

## آپلود روی GitHub

```bash
git init
git add .
git commit -m "Initial release of KabelWerkstatt"
git branch -M main
git remote add origin https://github.com/USERNAME/kabelwerkstatt.git
git push -u origin main
```

به جای `USERNAME` نام کاربری GitHub خودت را بگذار.
