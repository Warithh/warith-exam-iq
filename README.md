# Warith Exam — التحضير للامتحان الوطني (الإنكليزي)

موقع ثابت (HTML/CSS/JS) للدراسة والامتحان التجريبي بدون تسجيل دخول. تُحفظ الإحصاءات محليًا في المتصفح.

**المستودع على GitHub:** [https://github.com/Warithh/warith-exam-iq](https://github.com/Warithh/warith-exam-iq)

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

ملفات PDF في المجلد **لا تُرفع** للمستودع (مُستثناة في `.gitignore`); المحتوى المستخدم في الموقع موجود في `js/data.js` وملفات JS الأخرى.

## GitHub Pages

من **Settings → Pages**: اختر المصدر **Deploy from a branch**، الفرع **main**، المجلد **/ (root)**.  
بعد النشر يصبح الموقع على العنوان:

`https://Warithh.github.io/warith-exam-iq/`
