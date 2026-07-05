# Dogear 🐕📖

**Build a reading life.** A premium, social reading companion — Strava for readers, with the emotional intelligence of Letterboxd and the scroll of TikTok. Pure HTML/CSS/JS. No install, no build step, no backend. Runs from any folder, installs to any homescreen, works offline.

## What makes this different from a basic tracker

- **Cinematic onboarding** — genre picks → mood picks → a daily page dial → your name, with an aurora-gradient backdrop and step transitions. It **seeds a real recommendation engine**, not just a preferences form.
- **Discover** — a TikTok-style vertical snap feed of full-bleed book cards (blurred cover backdrop, synopsis, community rating, "why this is for you"). Every start/save/skip nudges a genre+mood affinity model that reorders the next feed.
- **Live book search** — queries Open Library's public API for real titles, authors, covers, page counts, and synopses; auto-tags genres from subject metadata. Falls back to elegant generated gradient covers offline or when a cover is missing.
- **Sessions like workouts** — timestamp-based timer (survives phone lock/tab close), a page slider to close out, mood tagging, then a full-screen animated **summary reward** with pages, pace, streak, and an XP pop — before offering a share card.
- **Shareable cards** — canvas-rendered 1080×1350 images (5 gradient themes) for a finished book, a single session, or a lifetime "wrapped" card, downloadable or sent through the native share sheet.
- **Gamification with restraint** — an XP/level curve, a heatmap, and 15 achievements (Night Owl, Book Marathon, Genre Explorer…) that unlock with a quiet toast, not a fireworks show.
- **Local-first** — everything lives in `localStorage`. JSON export/import for backup or moving devices. No account, no server, no tracking.

## Run it

```bash
python3 -m http.server 8080
# or: npx serve .
```
Open `http://localhost:8080`. (Opening `index.html` directly works too, minus the offline service worker, which needs `http://` or `https://`.)

## Install to homescreen

- **iOS Safari:** Share → Add to Home Screen
- **Android Chrome:** menu → Install app
- **Desktop Chrome/Edge:** install icon in the address bar

Once installed it runs standalone and works offline (search needs a connection; your library, timer, journal, and stats don't).

## Deploy free on GitHub Pages

```bash
git init && git add . && git commit -m "Dogear"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dogear.git
git push -u origin main
```
Then **Settings → Pages → Deploy from branch → main / (root)**. Live in a minute at `https://YOUR-USERNAME.github.io/dogear/`.

## Structure

```
dogear/
├── index.html          # shell: topbar mount points, bottom nav w/ session CTA
├── manifest.webmanifest
├── sw.js                # offline shell cache + network-first for API/covers
├── css/styles.css        # full design system: light/warm-paper + OLED dark, motion
├── js/catalog.js         # genres, moods, 48-book seed catalog, quotes, achievements, XP rules
├── js/store.js           # state, derived stats, streak/XP engine, affinity-based recs, cover cache
├── js/api.js             # Open Library search/synopsis + canvas share-card renderer
└── js/app.js              # onboarding, router, all views, timer, sheets, profile
```

## How the recommendation engine works

Each book has genre + mood tags. Your onboarding picks seed an **affinity score** per genre/mood (`store.js: affinity`). Starting, finishing, favoriting, or skipping a book nudges those scores up or down. The Discover feed and every book's "You may also like" rail score the catalog against your current affinities plus a small randomness factor for serendipity — so the feed keeps moving even if your taste doesn't.

## Data ownership

All state is one `localStorage` key (`dogear.state.v2`). Profile → **Export backup** downloads it as JSON; **Import backup** restores it on any device/browser. Resetting is explicit and confirmed — nothing is ever silently deleted.
