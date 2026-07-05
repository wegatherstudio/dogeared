# Dogeared 🐕📖

**Build a reading life.** A premium, social reading companion — Strava for readers, with the emotional intelligence of Letterboxd. Pure HTML/CSS/JS. No install, no build step, no backend. Runs from any folder, installs to any homescreen, works offline.

## What's in this build

- **Cinematic onboarding** — genre picks → mood picks → a daily page dial → your name. Every pick seeds a real recommendation engine, not just a preferences form.
- **Discover** — a vertical snap feed of full-bleed book cards. Skip a book and it's gone for good; hit "Deal me more" and the feed keeps flowing from where you were, no jump to the top.
- **Reflective Journaling** — a private space distinct from star ratings and reviews:
  - Per-book entries *and* freeform entries not tied to any book
  - Four entry kinds: **Reflection** (emotional prompts), **Character** (who stayed with you), **Analysis** (literary criticism/craft prompts), and **Quote**
  - Up to 4 photo attachments per entry — a marked-up page, a handwritten note, a view from where you were reading
  - Its own tab in the bottom nav, with filters by kind, by book, or freeform
- **Live book search** via Open Library, sticky search bar so it doesn't scroll away from long result lists.
- **Sessions like workouts** — timestamp-based timer (survives lock/close), page slider, mood tagging, then a full-screen animated summary with an XP pop.
- **Post-finish share cards** — now **9:16**, in five solid (no-gradient) color themes, plus a **transparent PNG export** with no cover/background — just the stats, meant to be overlaid on your own photo. Applies to book cards, session cards, and the profile's lifetime "share my stats" card.
- **Monthly Wrap** — a Spotify-Wrapped-style recap that auto-generates once each month closes: a swipeable, story-style viewer (tap or swipe through) covering the stat breakdown, a cover collage, your standout saved quote, a month-over-month comparison, an encouraging note on quiet months, and a next-month goal nudge. A banner appears on Home the moment it's ready.
- **Gamification with restraint** — XP/levels and 15 achievements, all rendered with a single-color icon system (no emoji, except the mid-session "how's it feel?" mood picker, which keeps its emoji on purpose).
- **Appearance** — light/dark toggle lives only in Profile, not cluttering every top bar. Dark mode gives the (dark-inked) logo mark a lighter halo so it's never dark-on-dark.
- **Local-first** — everything lives in `localStorage`. JSON export/import for backup or moving devices.

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

## Deploy free on GitHub Pages

```bash
git init && git add . && git commit -m "Dogeared"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dogeared.git
git push -u origin main
```
Then **Settings → Pages → Deploy from branch → main / (root)**. Live in a minute at `https://YOUR-USERNAME.github.io/dogeared/`.

## Structure

```
dogeared/
├── index.html          # shell: topbar mount points, 6-slot bottom nav (incl. Journal + session CTA)
├── manifest.webmanifest
├── sw.js                 # offline shell cache + network-first for API/covers
├── css/styles.css        # design system: solid colors only, light/dark, motion
├── js/icons.js            # single-color SVG icon set (no emoji, except session moods)
├── js/catalog.js         # genres, moods, 48-book seed catalog, quotes, achievements, journal prompts
├── js/store.js           # state, derived stats, streak/XP engine, affinity recs, monthly-wrap math
├── js/api.js             # Open Library search/synopsis + 9:16 solid-color share-card renderer
└── js/app.js              # onboarding, router, all views, timer, journal, monthly wrap, profile
```

## Notes

- **Discover's "skip"** is permanent for that book (stored in `S.seenFeed`) — it will not resurface. Wishlisting or starting a book removes it from the pool naturally since it's now in your library.
- **Share cards** are 1080×1920 canvases. Transparent mode skips the background fill and the cover entirely, by design, so it composites cleanly over your own photo.
- **Monthly Wrap** looks at the *previous* completed calendar month, only after your join date, and won't nag twice — opening it marks it viewed.
- All state lives under one `localStorage` key (`dogeared.state.v2`). Profile → **Export backup** downloads it as JSON; **Import backup** restores it anywhere.
