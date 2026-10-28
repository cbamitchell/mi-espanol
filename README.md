# Mi español — personal Spanish study page

Plain HTML/CSS/JavaScript. No server, login, database or paid services. Everything is saved in the browser (localStorage) with Export/Import backup buttons in ⚙️ Settings.

## Try it on your computer

Double-click `index.html`, or run a tiny local server from this folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell; loads the scripts below in order |
| `css/styles.css` | All styling (light + dark mode, big touch targets) |
| `js/util.js` | Helpers: dates, answer checking (accent-aware), sheets, toasts, speech |
| `js/store.js` | Saving/loading, example data, backup export/import |
| `js/srs.js` | Spaced repetition (Nope / Hard / Good / Easy) |
| `js/deck.js` | Flashcards & Mantras screens (shared) |
| `js/study.js` | Flip-card study session |
| `js/review.js` | Today's Review |
| `js/tables.js` | Grammar tables: editor, blank picker, fill-in-the-blank practice |
| `js/verbs.js` | Verb conjugation tables and practice |
| `js/notebook.js` | Study notebook pages with drag-to-reorder notes and tables |
| `js/settings.js` | Backup, voice, erase |
| `js/app.js` | Router and startup |

## Good to know

- Data lives in *one browser on one device*. Your phone and laptop each have their own copy; use Export → Import to move it.
- On iPhone, use Safari → Share → **Add to Home Screen**. Safari can clear saved data for websites you haven't opened in a while, but not for home-screen apps.
- Export a backup now and then (the home screen reminds you after 7 days).
