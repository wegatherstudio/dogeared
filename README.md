# Dogeared 🐕📖

**Build a reading life.** A premium, social reading companion — Strava for readers, with the emotional intelligence of Letterboxd. Pure HTML/CSS/JS. No install, no build step, no backend. Runs from any folder, installs to any homescreen, works offline.

## What's in this build

- **Floating iOS-style dock** — rounded, glass-blurred, anchored with margin (not edge-to-edge). The session timer button is a large, raised, high-contrast circle floating dead-center above the dock — unmistakably the primary action.
- **Cinematic onboarding** — genre picks → mood picks → a daily page dial → your name. Every pick seeds a real recommendation engine, not just a preferences form.
- **Discover** — a vertical snap feed of full-bleed book cards. The search icon stays fixed on screen while you scroll. Skip a book and it's gone for good. **Deal me more** never repeats what you've already been shown in this session, and quietly pulls fresh candidates live from Open Library once the local pool runs low.
- **Reflective Journaling — now on the Homepage.** No separate tab; your two most recent entries sit right on Home with a **New entry** button and an **Edit** button on each, plus a "See all entries" link to the full journal list (also editable there). Four entry kinds — Reflection, Character, Analysis, Quote — each with its own prompt set, and up to 4 photo attachments per entry.
- **Live book search** via Open Library, sticky search bar so it doesn't scroll away from long result lists.
- **Sessions like workouts** — the timer card now fills nearly the full screen (space reserved below for "Save a quote mid-read"), with a timestamp-based clock that survives lock/close, a page slider, mood tagging, then a full-screen animated summary with an XP pop.
- **Share cards** — 9:16, laid out with a fully dynamic text flow (long or short titles never overlap the author line — verified against titles that wrap to 1, 2, or 3 lines). Three background styles to choose from: **Cover theme** (a gradient sampled directly from the book's own cover art), **Classic** (the signature Dogeared gold→ochre→ember gradient, muted for legibility), and **Transparent** (no fill, no cover — just white text, for overlaying your own photo). Every card is always anchored to a real book cover when one exists. A date stamp sits under the kicker as dated proof. Every card you generate — even if closed without sharing — is saved to **Profile → Recent shares** for re-sending later.
- **Monthly Wrap** — a Spotify-Wrapped-style recap that auto-generates once each month closes: a swipeable, story-style viewer covering the stat breakdown, a cover collage, your standout saved quote, a month-over-month comparison, an encouraging note on quiet months, and a next-month goal nudge.
- **Gamification with restraint** — XP/levels and 15 achievements, all rendered with a single-color icon system (no emoji, except the mid-session "how's it feel?" mood picker, which keeps its emoji on purpose).
- **Appearance** — light/dark toggle lives only in Profile. Dark mode gives the (dark-inked) logo mark a lighter halo so it's never dark-on-dark.
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

- **Discover's "skip"** is permanent for that book (stored in `S.seenFeed`) — it will not resurface. **"Deal me more"** tracks everything shown this session so it never repeats, and automatically expands the pool via live Open Library search once fewer than 6 unseen local candidates remain.
- **Share cards** are 1080×1920 canvases with a restored brand gradient (gold → ochre → ember) for non-transparent exports; transparent mode drops the fill and the cover entirely so it composites cleanly over your own photo. A history of generated cards lives in Profile → Recent shares for re-sending later, dated so each one still reads as "proof for that day."
- **Monthly Wrap** looks at the *previous* completed calendar month, only after your join date, and won't nag twice — opening it marks it viewed.
- All state lives under one `localStorage` key (`dogeared.state.v2`). Profile → **Export backup** downloads it as JSON; **Import backup** restores it anywhere.
