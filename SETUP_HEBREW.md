# הוראות התקנה - YouTube Shorts Feature

## שלב 1: התקנת תלויות
פתח טרמינל בתיקיית הפרויקט והרץ:
```bash
npm install
```

## שלב 2: הפעלת השרת

### אפשרות א': הפעלה משולבת (מומלץ)
```bash
npm run dev:full
```
זה יפעיל גם את הפרונטאנד (פורט 3000) וגם את השרת (פורט 3002)

### אפשרות ב': הפעלה נפרדת
פתח 2 חלונות טרמינל:

**טרמינל 1 - שרת:**
```bash
npm run server
```

**טרמינל 2 - פרונטאנד:**
```bash
npm run dev
```

## פתרון בעיות

### שגיאה: "Cannot connect to backend server"
- ודא שהשרת רץ על פורט 3002
- בדוק שאין שגיאות בקונסול של השרת
- ודא שהתלויות מותקנות: `npm install`

### שגיאה: "Unexpected token '<'"
- זה אומר שהשרת לא רץ
- הפעל את השרת עם `npm run server` או `npm run dev:full`

### אין סרטונים מוצגים
- השרת רץ אבל לא מוצא סרטונים
- זה נורמלי - צריך להוסיף YouTube Data API v3 או להוסיף ידנית ID-ים של סרטונים
- ערוך את `server/services/youtubeService.js` והוסף ID-ים של YouTube Shorts

## בדיקה שהשרת עובד
פתח בדפדפן: http://localhost:3002/api/health
אמור לראות: `{"status":"ok","timestamp":"..."}`

