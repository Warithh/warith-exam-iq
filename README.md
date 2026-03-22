# Warith Exam — التحضير للامتحان الوطني (الإنكليزي)

موقع ثابت (HTML/CSS/JS) للدراسة والامتحان التجريبي بدون تسجيل دخول. تُحفظ الإحصاءات محليًا في المتصفح.

## التشغيل محليًا

افتح `index.html` في المتصفح، أو شغّل خادمًا محليًا للمجلد:

```bash
npx serve .
```

## هيكل المشروع

| المسار | الوصف |
|--------|--------|
| `index.html` | الصفحة الرئيسية (دراسة + امتحان + قطع) |
| `reading.html` | فورمة القطعة مع مؤقت |
| `proverbs.html` | الأمثال |
| `study_notes_page.html` | ملخص مراجعة |
| `css/` | أنماط الصفحات |
| `js/` | المنطق والبيانات (`data.js`, `app.js`, …) |

## الرفع على GitHub

بعد إنشاء مستودع فارغ على GitHub:

```bash
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

## GitHub Pages

من إعدادات المستودع: **Settings → Pages → Branch: main / folder: root** لنشر الموقع.
