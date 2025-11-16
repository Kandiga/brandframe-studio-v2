# פתרון בעיית "Supabase configuration is missing" ב-Netlify

אם אתה רואה את השגיאה הזאת באתר שלך ב-Netlify, זה אומר שמשתני הסביבה לא הוגדרו כראוי **לפני** ה-build.

## צ'קליסט - עבור על השלבים האלה בדיוק:

### שלב 1: בדוק שמשתני הסביבה מוגדרים ב-Netlify

1. ✅ גש ל-[Netlify Dashboard](https://app.netlify.com)
2. ✅ בחר את האתר שלך מרשימת האתרים
3. ✅ לחץ על **Site settings** (בתפריט העליון)
4. ✅ בתפריט הצדדי השמאלי, לחץ על **Environment variables**
5. ✅ **וודא שהמשתנים האלה קיימים:**

   ```
   VITE_SUPABASE_URL = https://ykdlyaxpqxsmajclmput.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZGx5YXhwcXhzbWFqY2xtcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg4MjAsImV4cCI6MjA3ODg1NDgyMH0.jUmdLgyXG_RX0ZhtYJTBUwipldz22vFH6l010BwSLUY
   ```

6. ✅ **חשוב**: שים לב שהשמות של המשתנים כתובים **בדיוק** כך (עם VITE_ בהתחלה)

### שלב 2: אם המשתנים לא קיימים - הוסף אותם

1. לחץ על **Add a variable**
2. הוסף את **VITE_SUPABASE_URL**:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://ykdlyaxpqxsmajclmput.supabase.co`
   - Values: בחר **Same value for all deploy contexts**
3. לחץ **Create variable**
4. לחץ על **Add a variable** שוב
5. הוסף את **VITE_SUPABASE_ANON_KEY**:
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZGx5YXhwcXhzbWFqY2xtcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg4MjAsImV4cCI6MjA3ODg1NDgyMH0.jUmdLgyXG_RX0ZhtYJTBUwipldz22vFH6l010BwSLUY`
   - Values: בחר **Same value for all deploy contexts**
6. לחץ **Create variable**

### שלב 3: הפעל build חדש (קריטי!)

**חשוב מאוד**: משתני סביבה בVite נטמעים בקוד בזמן ה-build. שינוי משתנים לא ישפיע על build קיים!

1. ✅ חזור לעמוד הראשי של האתר (לחץ על שם האתר בפינה השמאלית העליונה)
2. ✅ לחץ על הטאב **Deploys** (בתפריט העליון)
3. ✅ לחץ על הכפתור **Trigger deploy** (בצד ימין)
4. ✅ בחר **Clear cache and deploy site**
5. ✅ המתן עד שה-build יסתיים - תראה סטטוס "Published" בירוק

### שלב 4: בדוק שהכל עובד

1. ✅ לחץ על הקישור של האתר שלך (למשל `https://your-site-name.netlify.app`)
2. ✅ פתח את Developer Console (F12 בדפדפן)
3. ✅ רענן את הדף (F5)
4. ✅ בדוק שאין שגיאות של "Supabase configuration is missing"
5. ✅ נסה ליצור storyboard חדש - זה אמור לעבוד!

## אם עדיין לא עובד - בדוק את הלוגים

1. גש ל-Netlify Dashboard → האתר שלך → **Deploys**
2. לחץ על ה-deploy האחרון
3. לחץ על **Deploy log** כדי לראות את הלוגים
4. חפש שורות שמתחילות ב-`VITE_SUPABASE` - הן צריכות להיות מוגדרות
5. אם אתה רואה `VITE_SUPABASE_URL = undefined`, זה אומר שהמשתנים לא הוגדרו נכון

## שאלות נפוצות

### ש: הוספתי את המשתנים אבל עדיין מקבל שגיאה
**ת**: חייבים להריץ build חדש! משתני סביבה לא משפיעים על build קיים.

### ש: איפה אני מוצא את ה-ANON_KEY?
**ת**: הוא כבר מופיע למעלה. העתק את הערך המלא (מתחיל ב-`eyJhbGc...`)

### ש: האם המשתנים צריכים להיות Secret?
**ת**: לא! ה-ANON_KEY בטוח לחשיפה פומבית. אל תסמן אותם כ-Secret.

### ש: האם אני צריך משתני סביבה גם ב-Supabase?
**ת**: כן, אבל רק עבור Edge Functions. ב-Supabase Dashboard צריך להוסיף `GEMINI_API_KEY`.

## סיכום מהיר

1. ✅ הוסף משתני סביבה ב-Netlify
2. ✅ וודא שהשמות נכונים (עם VITE_)
3. ✅ הפעל build חדש (Clear cache and deploy)
4. ✅ המתן לסיום ה-build
5. ✅ בדוק את האתר

זהו! אם עקבת אחרי כל השלבים, האתר אמור לעבוד.
