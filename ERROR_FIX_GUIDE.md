# מדריך פתרון שגיאת "Failed to generate storyboard"

## הבעיה
המערכת מציגה שגיאה "Failed to generate storyboard" בעת ניסיון ליצור storyboard חדש.

## הסיבה השכיחה ביותר
**חסר GEMINI_API_KEY ב-Supabase Edge Function Secrets**

## פתרון השגיאה - שלב אחר שלב

### שלב 1: קבלת Gemini API Key

1. לך ל-[Google AI Studio](https://aistudio.google.com/app/apikey)
2. התחבר עם חשבון Google שלך
3. לחץ על **"Create API Key"**
4. העתק את ה-API Key (הוא מתחיל ב-`AIza...`)

### שלב 2: הוספת ה-API Key ל-Supabase

1. לך ל-[Supabase Dashboard](https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput)
2. התחבר לפרויקט שלך
3. בתפריט הצד, לחץ על **Project Settings** (⚙️)
4. בתפריט משנה, לחץ על **Edge Functions**
5. גלול למטה ל-**Secrets** section
6. לחץ על **Add Secret**
7. הזן:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: הדבק את ה-API Key שקיבלת בשלב 1
8. לחץ **Save**

### שלב 3: אימות ש-Edge Function פעיל

1. באותו ה-Dashboard של Supabase
2. לך ל-**Edge Functions** (בתפריט הצד)
3. בדוק שהפונקציה `gemini-storyboard` מוצגת ב-status **ACTIVE**
4. אם היא לא פעילה, לחץ עליה ואז **Deploy**

### שלב 4: בדיקה

1. חזור לאתר שלך
2. נסה ליצור storyboard חדש
3. אם עדיין יש שגיאה, המשך לשלב 5

### שלב 5: בדיקת Logs (אם עדיין יש בעיה)

1. ב-Supabase Dashboard, לך ל-**Edge Functions**
2. לחץ על **gemini-storyboard**
3. לחץ על **Logs** tab
4. חפש שגיאות אדומות ובדוק מה כתוב
5. אם יש שגיאת API key לא תקין, בדוק שה-key שהזנת נכון

## שגיאות נוספות אפשריות

### שגיאה: "GEMINI_API_KEY not configured"
**פתרון**: עקוב אחר שלבים 1-3 למעלה

### שגיאה: "Invalid API key"
**פתרון**:
- בדוק שה-API Key שהדבקת שלם ונכון
- ודא שה-API Key פעיל ב-[Google AI Studio](https://aistudio.google.com/app/apikey)
- נסה ליצור API Key חדש

### שגיאה: "Quota exceeded"
**פתרון**:
- הגעת למכסה החודשית/יומית של Gemini API
- בדוק את [Google AI Studio Quotas](https://aistudio.google.com/app/apikey)
- שקול שדרוג לתוכנית בתשלום

### שגיאה: "Request too large"
**פתרון**:
- התמונות שהעלית גדולות מדי
- כווץ את התמונות לפני העלאה (מומלץ עד 2MB לתמונה)
- השתמש בכלי כמו [TinyPNG](https://tinypng.com/) לכיווץ

## עדיין לא עובד?

אם עדיין יש בעיות:

1. **נקה Cache**:
   - במחשב: Ctrl+Shift+R (Windows) או Cmd+Shift+R (Mac)
   - בנייד: הגדרות → מחיקת cache

2. **בדוק Netlify Environment Variables**:
   - לך ל-[Netlify Dashboard](https://app.netlify.com)
   - Site settings → Environment variables
   - ודא ש-`VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY` מוגדרים נכון

3. **Trigger Deploy מחדש ב-Netlify**:
   - Deploys → Trigger deploy → Clear cache and deploy site

4. **צור issue ב-GitHub** עם:
   - צילום מסך של השגיאה
   - העתקה של ה-error message המלא
   - מה ניסית לעשות כשהשגיאה התרחשה

## עזרה נוספת

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [קובץ GEMINI_API_ACTIVATION.md](./GEMINI_API_ACTIVATION.md) לפרטים נוספים על הפעלת Gemini API

---

**עדכון אחרון**: נובמבר 2024
