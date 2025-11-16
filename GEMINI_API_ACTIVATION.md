# פתרון שגיאת Gemini API - "SERVICE_DISABLED"

## הבעיה
קיבלת שגיאה:
```
Generative Language API has not been used in project 573529931500 before or it is disabled
```

זה אומר שה-API של Gemini לא מופעל בפרויקט Google Cloud שלך.

## הפתרון - 3 שלבים פשוטים

### שלב 1: הפעל את ה-Generative Language API

1. ✅ לחץ על הקישור הזה: [הפעל Generative Language API](https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=573529931500)

2. ✅ התחבר עם חשבון Google שלך (אותו חשבון שיצרת איתו את ה-API key)

3. ✅ תראה עמוד עם כפתור **"Enable"** (הפעל) - לחץ עליו

4. ✅ המתן 2-3 דקות עד שה-API יופעל במערכת

### שלב 2: וודא שה-API Key מוגדר ב-Supabase

1. ✅ גש ל-[Supabase Dashboard](https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput)

2. ✅ לך ל-**Settings** → **Edge Functions** → **Secrets**

3. ✅ בדוק ש-`GEMINI_API_KEY` קיים ברשימה
   - אם לא קיים, לחץ **Add new secret**:
     - Name: `GEMINI_API_KEY`
     - Value: ה-API key שלך מ-Google AI Studio

4. ✅ שמור את השינויים

### שלב 3: נסה שוב ליצור Storyboard

1. ✅ המתן 2-3 דקות אחרי הפעלת ה-API
2. ✅ רענן את האפליקציה שלך
3. ✅ נסה ליצור storyboard חדש
4. ✅ זה אמור לעבוד עכשיו!

## איפה מוצאים את ה-API Key?

אם אין לך API key עדיין:

1. גש ל-[Google AI Studio](https://makersuite.google.com/app/apikey)
2. לחץ **Create API Key**
3. בחר פרויקט (או צור חדש)
4. העתק את ה-API key
5. **חשוב**: הפעל את ה-Generative Language API (השלב 1 למעלה)
6. הוסף את ה-API key ל-Supabase Secrets

## בדיקה שה-API הופעל

אחרי שהפעלת את ה-API:

1. גש ל-[Google Cloud Console APIs](https://console.cloud.google.com/apis/dashboard?project=573529931500)
2. תראה "Generative Language API" ברשימת APIs מופעלים
3. אם אתה רואה אותו ברשימה - מעולה! זה אומר שהוא מופעל

## שאלות נפוצות

### ש: כמה זמן לוקח להפעיל את ה-API?
**ת**: בדרך כלל 1-3 דקות. במקרים נדירים עד 10 דקות.

### ש: האם יש עלות על הפעלת ה-API?
**ת**: Google AI Studio נותן מכסה חינמית נדיבה. בדוק את [המחירים](https://ai.google.dev/pricing).

### ש: יש לי יותר מפרויקט אחד - איזה אחד לבחור?
**ת**: בחר את הפרויקט שמופיע בשגיאה (573529931500), או צור API key חדש ובחר פרויקט אחר.

### ש: עדיין מקבל שגיאה אחרי הפעלת ה-API
**ת**:
1. המתן עוד כמה דקות
2. בדוק שה-API key נכון ב-Supabase Secrets
3. בדוק שאין מגבלות quota בפרויקט Google Cloud
4. נסה ליצור API key חדש

## קישורים שימושיים

- [Google AI Studio - יצירת API Keys](https://makersuite.google.com/app/apikey)
- [הפעלת Generative Language API](https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=573529931500)
- [Supabase Dashboard](https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput)
- [Google Cloud Console](https://console.cloud.google.com/)

## תמיכה נוספת

אם אחרי כל השלבים האלה עדיין לא עובד, בדוק:
1. Supabase Edge Function Logs
2. Browser Console לשגיאות
3. Google Cloud Console Logs
