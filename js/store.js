/* ================================================================
   DOGEAR — store.js
   Local-first state, derived stats, XP engine, recommendation
   scoring, online cover resolution with caching.
================================================================ */
"use strict";

const DB_KEY = "dogear.state.v2";
const TIMER_KEY = "dogear.timer.v2";
const COVER_KEY = "dogear.covers.v1";

const defaultState = () => ({
  profile: null, // {name, genres[], moods[], dailyGoal, joinedAt}
  books: [],     // {id,t,a,p,y,g[],cover(url|null),gen(bool from catalog id),shelf,addedAt,startedAt,finishedAt,rating,review,currentPage,fav,olKey}
  sessions: [],  // {id,bookId,date,minutes,startPage,endPage,mood,createdAt}
  journal: [],   // {id,bookId|null,text,kind:'note'|'quote',createdAt}
  xp: 0,
  xpLog: [],     // {ts, amount, why}
  affinity: { genres: {}, moods: {} }, // learned weights from behavior
  seenFeed: [],  // catalog ids already shown/skipped
  unlocked: {},  // achievement id -> ISO date
  wrapsViewed: {}, // "YYYY-MM" -> true
  wrapBannerShownAt: {}, // "YYYY-MM" -> ISO timestamp of when the recap banner first appeared
  shareHistory: [], // past generated share cards, for re-sharing
  remoteCatalog: [], // books discovered live via Open Library, merged into the rec pool
  readerProfile: null, // { weekKey, text, generatedAt } — a locally-computed reading-habits summary
  settings: { theme: "auto", notificationsAsked: false },
  streakFreezes: 0,        // earned every 7-day streak milestone; auto-covers one missed day
  usedFreezeDates: [],     // "YYYY-MM-DD" dates already covered by a freeze (idempotency)
  lastFreezeMilestone: 0,  // highest streak length a freeze has already been awarded for
  lastResumeNudgeAt: null, // ISO timestamp — so the 5-day idle nudge doesn't repeat every app open
  lastDroppedNudgeAt: null, // ISO timestamp — gentle dropped-book resurface, at most every 14 days
});

let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return Object.assign(defaultState(), s, {
      affinity: Object.assign({ genres: {}, moods: {} }, s.affinity),
      settings: Object.assign({ theme: "auto", notificationsAsked: false }, s.settings),
      wrapsViewed: Object.assign({}, s.wrapsViewed),
      wrapBannerShownAt: Object.assign({}, s.wrapBannerShownAt),
      profile: s.profile ? Object.assign({ yearlyGoal: 24 }, s.profile) : null,
      shareHistory: Array.isArray(s.shareHistory) ? s.shareHistory : [],
      remoteCatalog: Array.isArray(s.remoteCatalog) ? s.remoteCatalog : [],
      readerProfile: s.readerProfile || null,
    });
  } catch { return defaultState(); }
}
function saveState() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(S)); }
  catch { toast("Local storage is full — export a backup from Profile."); }
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtHM = (mins) => {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const fmtDateNice = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* ---------------- derived ---------------- */
const bookSessions = (id) => S.sessions.filter((s) => s.bookId === id);

function bookStats(id) {
  const ss = bookSessions(id);
  const minutes = ss.reduce((a, s) => a + s.minutes, 0);
  const days = new Set(ss.map((s) => s.date)).size;
  const pages = ss.reduce((a, s) => a + Math.max(0, (s.endPage || 0) - (s.startPage || 0)), 0);
  const pace = minutes && pages ? pages / (minutes / 60) : 0;
  const last = ss.length ? ss.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
  return { minutes, days, sessions: ss.length, pages, pace, last };
}

function minutesByDate() {
  const map = {};
  for (const s of S.sessions) map[s.date] = (map[s.date] || 0) + s.minutes;
  return map;
}
function pagesByDate() {
  const map = {};
  for (const s of S.sessions) map[s.date] = (map[s.date] || 0) + Math.max(0, (s.endPage || 0) - (s.startPage || 0));
  return map;
}

/* streak: a day counts with ≥5 min; today pending doesn't break it.
   A date in usedFreezeDates also counts, as if that day had been active —
   the decision to actually spend a freeze happens elsewhere (see
   checkStreakFreeze), this just reads whatever's already been decided. */
function computeStreak() {
  const map = minutesByDate();
  const covered = (d) => (map[todayStr(d)] || 0) >= 5 || S.usedFreezeDates.includes(todayStr(d));
  let d = new Date(), n = 0;
  if (!covered(d)) d.setDate(d.getDate() - 1);
  while (covered(d)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/* Called once per app boot / heartbeat tick. Two jobs:
   1. Award a freeze every 7-day streak milestone, once each.
   2. If yesterday would have broken an otherwise-live streak and a freeze
      is available, spend one automatically to cover it — quiet, no
      confirmation needed, matching the app's low-pressure tone. */
function checkStreakFreeze() {
  const map = minutesByDate();
  const streak = computeStreak();
  if (streak > 0 && streak % 7 === 0 && streak > S.lastFreezeMilestone) {
    S.lastFreezeMilestone = streak;
    S.streakFreezes = (S.streakFreezes || 0) + 1;
    saveState();
    toast("A 7-day streak earned you a freeze — one missed day won't break it. 🧊");
    return;
  }
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = todayStr(y);
  const yesterdayMissed = (map[yStr] || 0) < 5;
  const alreadyFrozen = S.usedFreezeDates.includes(yStr);
  const dayBefore = new Date(y); dayBefore.setDate(dayBefore.getDate() - 1);
  const hadLiveStreakBefore = (map[todayStr(dayBefore)] || 0) >= 5 || S.usedFreezeDates.includes(todayStr(dayBefore));
  if (yesterdayMissed && !alreadyFrozen && hadLiveStreakBefore && (S.streakFreezes || 0) > 0) {
    S.usedFreezeDates.push(yStr);
    S.streakFreezes -= 1;
    saveState();
    toast("Used a streak freeze to keep yesterday covered.");
  }
}
function bestStreak() {
  const days = Object.keys(minutesByDate()).filter((k) => minutesByDate()[k] >= 5).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    if (prev) {
      const diff = (new Date(d) - new Date(prev)) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    } else cur = 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

function lastSessionDate() {
  if (!S.sessions.length) return null;
  return S.sessions.reduce((latest, s) => (!latest || s.date > latest ? s.date : latest), null);
}
function mostRecentReadingBook() {
  const reading = S.books.filter((b) => b.shelf === "reading");
  if (!reading.length) return null;
  const lastActivity = (b) => {
    const sessions = S.sessions.filter((s) => s.bookId === b.id);
    const lastSession = sessions.reduce((latest, s) => (!latest || s.date > latest ? s.date : latest), null);
    return lastSession || b.startedAt || b.addedAt || "";
  };
  return reading.slice().sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))[0];
}

/* Occasionally resurface one dropped book — "still curious about this
   one?" rather than a guilt trip. At most once every 14 days. */
function droppedBookNudge() {
  const dropped = S.books.filter((b) => b.shelf === "dropped");
  if (!dropped.length) return null;
  if (S.lastDroppedNudgeAt) {
    const days = (Date.now() - new Date(S.lastDroppedNudgeAt).getTime()) / 86400000;
    if (days < 14) return null;
  }
  const pick = dropped[Math.floor(Math.random() * dropped.length)];
  S.lastDroppedNudgeAt = new Date().toISOString();
  saveState();
  return pick;
}

function booksFinishedThisYear() {
  const year = new Date().getFullYear();
  return S.books.filter((b) => b.shelf === "finished" && b.finishedAt && new Date(b.finishedAt).getFullYear() === year).length;
}

function onThisDayMemory() {
  const now = new Date();
  const mm = now.getMonth(), dd = now.getDate(), thisYear = now.getFullYear();
  const sameDay = (dateStr) => {
    const d = new Date(dateStr);
    return d.getMonth() === mm && d.getDate() === dd && d.getFullYear() < thisYear;
  };
  const finishMatches = S.books
    .filter((b) => b.finishedAt && sameDay(b.finishedAt))
    .sort((a, b) => new Date(b.finishedAt).getFullYear() - new Date(a.finishedAt).getFullYear());
  if (finishMatches.length) {
    const b = finishMatches[0];
    return { type: "finish", book: b, yearsAgo: thisYear - new Date(b.finishedAt).getFullYear() };
  }
  const sessionMatches = S.sessions
    .filter((s) => sameDay(s.date))
    .sort((a, b) => new Date(b.date).getFullYear() - new Date(a.date).getFullYear());
  for (const s of sessionMatches) {
    const book = S.books.find((b) => b.id === s.bookId);
    if (book) return { type: "session", book, yearsAgo: thisYear - new Date(s.date).getFullYear() };
  }
  return null;
}

function globalStats() {
  const totalMin = S.sessions.reduce((a, s) => a + s.minutes, 0);
  const totalPages = S.sessions.reduce((a, s) => a + Math.max(0, (s.endPage || 0) - (s.startPage || 0)), 0);
  const finishedBooks = S.books.filter((b) => b.shelf === "finished");
  const genresFinished = new Set(finishedBooks.flatMap((b) => b.g || [])).size;
  return {
    totalMin, totalPages,
    finished: finishedBooks.length,
    genresFinished,
    bestStreak: bestStreak(),
    streak: computeStreak(),
  };
}

function pagesToday() {
  return pagesByDate()[todayStr()] || 0;
}
function pagesThisWeek() {
  const map = pagesByDate();
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    sum += map[todayStr(d)] || 0;
  }
  return sum;
}
function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(todayStr(d)); }
  return out;
}
function minutesThisWeek() {
  const days = new Set(last7Days());
  return S.sessions.filter((s) => days.has(s.date)).reduce((a, s) => a + s.minutes, 0);
}
function sessionsThisWeek() {
  const days = new Set(last7Days());
  return S.sessions.filter((s) => days.has(s.date)).length;
}
function booksFinishedThisWeek() {
  const days = new Set(last7Days());
  return S.books.filter((b) => b.shelf === "finished" && days.has((b.finishedAt || "").slice(0, 10))).length;
}
function weekRangeLabel() {
  const days = last7Days();
  const [y1, m1, d1] = days[0].split("-").map(Number);
  const [y2, m2, d2] = days[6].split("-").map(Number);
  const start = new Date(y1, m1 - 1, d1), end = new Date(y2, m2 - 1, d2);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

/* estimated completion for a currently-reading book */
function estimateFinish(book) {
  if (!book.p) return null;
  const st = bookStats(book.id);
  const left = book.p - (book.currentPage || 0);
  if (left <= 0) return "any moment now";
  const dailyAvg = st.days ? st.pages / st.days : 0;
  const rate = Math.max(dailyAvg, S.profile?.dailyGoal || 10);
  const days = Math.ceil(left / rate);
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------- XP ---------------- */
function grantXP(amount, why) {
  if (amount <= 0) return;
  S.xp += Math.round(amount);
  S.xpLog.push({ ts: Date.now(), amount: Math.round(amount), why });
  if (S.xpLog.length > 300) S.xpLog = S.xpLog.slice(-300);
}

/* returns newly unlocked achievements */
function checkAchievements() {
  const d = globalStats();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!S.unlocked[a.id] && a.test(S, d)) {
      S.unlocked[a.id] = new Date().toISOString();
      fresh.push(a);
      grantXP(50, `Achievement: ${a.t}`);
    }
  }
  return fresh;
}

/* ---------------- affinity learning ---------------- */
function bump(kind, keys, amt) {
  for (const k of keys || []) {
    S.affinity[kind][k] = Math.max(-4, Math.min(10, (S.affinity[kind][k] || 0) + amt));
  }
}
function learnFrom(book, signal) {
  // signal: 'save' | 'start' | 'finish' | 'skip' | 'love'
  const w = { save: 1.2, start: 1.6, finish: 2.5, love: 2, skip: -0.7 }[signal] || 0;
  bump("genres", book.g, w);
  bump("moods", book.m, w * 0.8);
}

/* ---------------- recommendation scoring ---------------- */
function allCandidates() {
  return CATALOG.concat(S.remoteCatalog || []);
}
/* books already on any shelf (reading/finished/wishlist/dropped) or
   permanently skipped — never shown in Discover, regardless of how
   long ago that happened or which device it happened on. */
function excludedFromDiscover() {
  const inLib = new Set(S.books.map((b) => b.catalogId).filter(Boolean));
  return { inLib, skipped: new Set(S.seenFeed) };
}
/* authors you've read, finished, or wishlisted — "related interests":
   their other books get a boost even outside your picked genres/moods */
function authorAffinity() {
  const counts = {};
  for (const b of S.books) {
    if (!b.a || b.shelf === "dropped") continue;
    const w = b.shelf === "finished" ? 3 : b.shelf === "reading" ? 2 : 1;
    counts[b.a] = (counts[b.a] || 0) + w;
  }
  return counts;
}
function scoreBook(cb, authorScores) {
  let s = 0;
  const pg = S.profile?.genres || [], pm = S.profile?.moods || [];
  for (const g of cb.g) {
    if (pg.includes(g)) s += 5;                          // onboarding genre pick — strong signal
    s += (S.affinity.genres[g] || 0) * 1.3;               // learned from reading activity over time
  }
  for (const m of cb.m || []) {
    if (pm.includes(m)) s += 3;                           // onboarding mood pick
    s += (S.affinity.moods[m] || 0) * 0.9;
  }
  if (cb.a && authorScores) s += (authorScores[cb.a] || 0) * 2.2; // related interests: authors you already read
  s += ((cb.r || 3.9) - 3.8) * 1.4;                        // community quality — a lighter tiebreaker now
  s += Math.random() * 0.9;                                // a little serendipity, not the deciding factor
  return s;
}
/* excludeIds: ids already shown this session (keeps "Deal me more" from repeating) */
function recommendationFeed(n = 10, excludeIds) {
  const { inLib, skipped } = excludedFromDiscover();
  const exclude = excludeIds || new Set();
  const authorScores = authorAffinity();
  const pool = allCandidates().filter((c) => !inLib.has(c.id) && !skipped.has(c.id) && !exclude.has(c.id));
  return pool.map((c) => [scoreBook(c, authorScores), c]).sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);
}
function poolRemaining(excludeIds) {
  const { inLib, skipped } = excludedFromDiscover();
  const exclude = excludeIds || new Set();
  return allCandidates().filter((c) => !inLib.has(c.id) && !skipped.has(c.id) && !exclude.has(c.id)).length;
}
function whyForYou(cb) {
  const pg = S.profile?.genres || [], pm = S.profile?.moods || [];
  const g = cb.g.find((x) => pg.includes(x) || (S.affinity.genres[x] || 0) > 1);
  const m = (cb.m || []).find((x) => pm.includes(x) || (S.affinity.moods[x] || 0) > 1);
  const gl = GENRES.find((x) => x.id === g)?.label;
  const ml = MOODS.find((x) => x.id === m)?.label.toLowerCase();
  if (gl && ml) return `Because you read ${gl.toLowerCase()} and chase ${ml}`;
  if (gl) return `Because ${gl.toLowerCase()} is your territory`;
  if (ml) return `For when you want something ${ml}`;
  return "A step outside your usual — trust us";
}
function similarBooks(book, n = 4) {
  const inLib = new Set(S.books.map((b) => b.catalogId).filter(Boolean));
  return allCandidates()
    .filter((c) => c.id !== book.catalogId && !inLib.has(c.id))
    .map((c) => {
      let s = 0;
      for (const g of c.g) if ((book.g || []).includes(g)) s += 2;
      for (const m of c.m || []) if ((book.m || []).includes(m)) s += 1;
      if (c.a === book.a) s += 3;
      s += Math.random();
      return [s, c];
    })
    .sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);
}

/* ---------------- live catalog expansion (Open Library) ----------------
   When the local pool runs low, pull fresh candidates seeded by top
   affinity genres and loved/finished authors — Discover keeps finding
   new books instead of recycling the same seed catalog. */
let _expandingCatalog = false;
async function expandRemoteCatalog() {
  if (_expandingCatalog || !navigator.onLine) return false;
  _expandingCatalog = true;
  try {
    const topGenres = Object.entries(S.affinity.genres || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
    const genreQueries = topGenres.map((g) => GENRES.find((x) => x.id === g)?.label).filter(Boolean);
    const lovedAuthors = [...new Set(S.books.filter((b) => b.fav || b.shelf === "finished").map((b) => b.a).filter(Boolean))].slice(0, 2);
    const queries = [...genreQueries, ...lovedAuthors];
    if (!queries.length) queries.push("popular fiction");

    const known = new Set(allCandidates().map((c) => (c.t + "::" + c.a).toLowerCase()));
    let added = 0;
    for (const q of queries.slice(0, 3)) {
      try {
        const docs = await olSearch(q, 10);
        for (const d of docs) {
          const key = (d.t + "::" + d.a).toLowerCase();
          if (!d.t || known.has(key)) continue;
          known.add(key);
          S.remoteCatalog.push({
            id: "ol-" + (d.olKey || uid()).replace(/[^a-zA-Z0-9]/g, ""),
            t: d.t, a: d.a, g: d.g && d.g.length ? d.g : ["litfic"], m: [],
            p: d.p || null, y: d.y || null, r: d.r || null, b: "", cover: d.cover || null, olKey: d.olKey,
          });
          added++;
        }
      } catch { /* one query failing shouldn't stop the others */ }
    }
    if (S.remoteCatalog.length > 400) S.remoteCatalog = S.remoteCatalog.slice(-400);
    if (added) saveState();
    return added > 0;
  } finally {
    _expandingCatalog = false;
  }
}

/* ---------------- library ops ---------------- */
function addBookFromCatalog(cb, shelf) {
  const existing = S.books.find((b) => b.catalogId === cb.id);
  if (existing) { moveShelf(existing, shelf); return existing; }
  const b = {
    id: uid(), catalogId: cb.id, t: cb.t, a: cb.a, p: cb.p, y: cb.y,
    g: cb.g, m: cb.m, r: cb.r, b: cb.b, cover: null, olKey: null,
    shelf, addedAt: new Date().toISOString(),
    startedAt: shelf === "reading" ? new Date().toISOString() : null,
    finishedAt: null, rating: 0, review: "", currentPage: 0, fav: false,
    format: "physical", whyPickedUp: "", borrowed: false, dueDate: null,
  };
  S.books.push(b);
  learnFrom(cb, shelf === "reading" ? "start" : "save");
  saveState();
  resolveCover(b);
  return b;
}
function moveShelf(book, shelf) {
  const prev = book.shelf;
  book.shelf = shelf;
  if (shelf === "reading" && !book.startedAt) book.startedAt = new Date().toISOString();
  if (shelf === "finished" && prev !== "finished") {
    book.finishedAt = new Date().toISOString();
    if (book.p) book.currentPage = book.p;
    grantXP(XP_RULES.finishBook, `Finished ${book.t}`);
    learnFrom(book, "finish");
  }
  saveState();
}

/* Reread: archive the prior read-through (finish date, rating, review) onto
   the book's readHistory, then send it back to the reading shelf starting
   from page 0 — a fresh pass with its own sessions and its own finish. */
function startReread(book) {
  book.readHistory = book.readHistory || [];
  book.readHistory.push({
    finishedAt: book.finishedAt || null,
    rating: book.rating || null,
    review: book.review || null,
  });
  book.rereadCount = (book.rereadCount || 0) + 1;
  book.shelf = "reading";
  book.startedAt = new Date().toISOString();
  book.finishedAt = null;
  book.rating = null;
  book.review = null;
  book.currentPage = 0;
  saveState();
}

/* ================================================================
   COVERS — resolve via Open Library when online, cache forever.
   Offline → elegant generated covers.
================================================================ */
const coverCache = (() => {
  try { return JSON.parse(localStorage.getItem(COVER_KEY)) || {}; } catch { return {}; }
})();
function saveCoverCache() {
  try { localStorage.setItem(COVER_KEY, JSON.stringify(coverCache)); } catch {}
}
const coverKeyFor = (b) => `${b.t}::${b.a}`.toLowerCase();

async function resolveCover(book) {
  const key = coverKeyFor(book);
  if (book.cover) return book.cover;
  if (coverCache[key]) {
    book.cover = coverCache[key].url;
    book.olKey = coverCache[key].olKey || book.olKey;
    saveState();
    document.dispatchEvent(new CustomEvent("cover", { detail: book.id }));
    return book.cover;
  }
  if (!navigator.onLine) return null;
  try {
    const q = encodeURIComponent(`${book.t} ${book.a || ""}`.trim());
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&fields=key,cover_i,title,author_name&limit=1`);
    const data = await res.json();
    const doc = data.docs?.[0];
    if (doc?.cover_i) {
      const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      coverCache[key] = { url, olKey: doc.key };
      saveCoverCache();
      book.cover = url; book.olKey = doc.key;
      saveState();
      document.dispatchEvent(new CustomEvent("cover", { detail: book.id }));
      return url;
    }
    coverCache[key] = { url: null };
    saveCoverCache();
  } catch {}
  return null;
}
/* resolve covers for raw catalog entries used in the feed */
async function resolveCatalogCover(cb) {
  const fake = { t: cb.t, a: cb.a };
  const key = coverKeyFor(fake);
  if (coverCache[key] !== undefined) return coverCache[key]?.url || null;
  return resolveCover(Object.assign(fake, { id: "cat-" + cb.id }));
}

/* generated cover markup */
function genCoverHTML(item, cls = "cover") {
  const hue = GENRE_HUES[(item.g || [])[0]] || "#4A4A4E";
  return `<div class="${cls} gencover" style="background:${hue}">
    <div class="gt serif">${esc(item.t)}</div><div class="ga">${esc(item.a || "")}</div>
  </div>`;
}
function coverHTML(item, cls = "cover") {
  const key = coverKeyFor(item);
  const url = item.cover || coverCache[key]?.url;
  if (url) return `<img class="${cls}" src="${url}" alt="" loading="lazy" crossorigin="anonymous" onerror="this.outerHTML=genCoverHTML(${esc(JSON.stringify({t:item.t,a:item.a,g:item.g}))},'${cls}')">`;
  return genCoverHTML(item, cls);
}

/* ---------------- images (journal attachments) ---------------- */
function fileToDataURL(file, maxDim = 640, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ================================================================
   MONTHLY WRAP — Spotify-Wrapped-style recap, computed on demand
================================================================ */
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
function prevMonthKey(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

function computeMonthStats(ym) {
  const sessions = S.sessions.filter((s) => s.date.startsWith(ym));
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const pages = sessions.reduce((a, s) => a + Math.max(0, (s.endPage || 0) - (s.startPage || 0)), 0);
  const bookIds = new Set(sessions.map((s) => s.bookId));
  const booksTouched = S.books.filter((b) => bookIds.has(b.id));
  const finished = S.books.filter((b) => b.shelf === "finished" && (b.finishedAt || "").startsWith(ym));

  // best streak fully inside this month (approx via consecutive qualifying days)
  const daySet = new Set();
  sessions.forEach((s) => { if (s.minutes >= 5 || true) {} });
  const byDate = {};
  sessions.forEach((s) => { byDate[s.date] = (byDate[s.date] || 0) + s.minutes; });
  const qualDays = Object.keys(byDate).filter((d) => byDate[d] >= 5).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of qualDays) {
    cur = prev && (new Date(d) - new Date(prev)) / 86400000 === 1 ? cur + 1 : 1;
    best = Math.max(best, cur); prev = d;
  }

  const genreCount = {};
  finished.forEach((b) => (b.g || []).forEach((g) => genreCount[g] = (genreCount[g] || 0) + 1));
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);

  const topBook = finished.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
    || booksTouched.slice().sort((a, b) => bookStats(b.id).minutes - bookStats(a.id).minutes)[0] || null;

  const quotesThisMonth = S.journal.filter((j) => j.kind === "quote" && (j.createdAt || "").startsWith(ym));
  const quote = quotesThisMonth.length ? quotesThisMonth[quotesThisMonth.length - 1] : null;

  return {
    ym, label: monthLabel(ym), minutes, pages, sessions: sessions.length,
    finished, booksTouched, bestStreak: best, topGenres, topBook, quote,
  };
}

/* Is a wrap ready & unviewed? Only past (completed) months, only after joining.
   Once it first becomes available, it stays visible for a full 2-hour window
   (even across navigating away and back) so a quick glance-away never means
   missing it — but it isn't a permanent nag either. */
const WRAP_BANNER_WINDOW_MS = 2 * 60 * 60 * 1000;
function pendingWrapMonth() {
  if (!S.profile?.joinedAt) return null;
  const now = new Date();
  const thisYm = monthKey(now);
  let ym = prevMonthKey(thisYm);
  const joinYm = monthKey(new Date(S.profile.joinedAt));
  if (ym < joinYm) return null;
  if (S.wrapsViewed?.[ym]) return null;

  S.wrapBannerShownAt = S.wrapBannerShownAt || {};
  if (!S.wrapBannerShownAt[ym]) { S.wrapBannerShownAt[ym] = now.toISOString(); saveState(); }
  const firstShown = new Date(S.wrapBannerShownAt[ym]).getTime();
  if (now.getTime() - firstShown > WRAP_BANNER_WINDOW_MS) return null;

  return ym;
}
function markWrapViewed(ym) {
  S.wrapsViewed = S.wrapsViewed || {};
  S.wrapsViewed[ym] = true;
  saveState();
}

function booksForShelf(max = 12) {
  return S.books.filter((b) => b.shelf === "finished")
    .sort((a, b) => (a.finishedAt || "").localeCompare(b.finishedAt || ""))
    .slice(-max);
}

/* ---------------- reader profile — a short, locally-computed reading-habits blurb ----------------
   Not a live LLM call (this is a static, offline-first app with no backend) — instead it's a
   deterministic read of the same signals an AI writeup would use: top genre/mood affinity,
   time-of-day pattern, pace, streak, and what's currently open. Regenerates weekly, or on demand. */
function isoWeekKey(d = new Date()) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
function timeOfDayPattern() {
  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  S.sessions.forEach((s) => {
    const h = new Date(s.createdAt).getHours();
    if (h >= 5 && h < 12) buckets.morning++;
    else if (h >= 12 && h < 17) buckets.afternoon++;
    else if (h >= 17 && h < 22) buckets.evening++;
    else buckets.night++;
  });
  const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : null;
}
function computeReaderProfileText() {
  const g = globalStats();
  const topGenreId = Object.entries(S.affinity.genres || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMoodId = Object.entries(S.affinity.moods || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const genreLabel = GENRES.find((x) => x.id === topGenreId)?.label;
  const moodLabel = MOODS.find((x) => x.id === topMoodId)?.label.toLowerCase();
  const reading = S.books.find((b) => b.shelf === "reading");
  const tod = timeOfDayPattern();
  const todPhrase = { morning: "in the morning", afternoon: "in the afternoon", evening: "in the evening", night: "late at night" }[tod];

  const avgPace = (() => {
    const withPace = S.sessions.filter((s) => s.minutes > 0 && (s.endPage || 0) > (s.startPage || 0));
    if (!withPace.length) return null;
    const total = withPace.reduce((a, s) => a + (s.endPage - s.startPage) / (s.minutes / 60), 0);
    return Math.round(total / withPace.length);
  })();

  if (!S.sessions.length) {
    return "Your reading profile is still taking shape — log a session or two and this will start to sound like you.";
  }

  const parts = [];
  if (genreLabel && moodLabel) parts.push(`Mostly drawn to ${genreLabel.toLowerCase()}, especially when it leans ${moodLabel}`);
  else if (genreLabel) parts.push(`Mostly drawn to ${genreLabel.toLowerCase()} right now`);
  else parts.push("Still finding a favorite lane, and that's part of the fun");

  if (todPhrase) parts.push(`you tend to read ${todPhrase}`);
  if (avgPace) parts.push(`at a ${avgPace >= 45 ? "brisk" : avgPace >= 25 ? "steady" : "unhurried"} pace of about ${avgPace} pages an hour`);
  if (g.streak >= 3) parts.push(`riding a ${g.streak}-day streak`);

  let sentence = parts.join(", ") + ".";
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  if (reading) sentence += ` Right now, deep into "${reading.t}".`;
  return sentence;
}
function ensureReaderProfileFresh(force = false) {
  const wk = isoWeekKey();
  if (!force && S.readerProfile && S.readerProfile.weekKey === wk) return S.readerProfile.text;
  const text = computeReaderProfileText();
  S.readerProfile = { weekKey: wk, text, generatedAt: new Date().toISOString() };
  saveState();
  return text;
}

/* ---------------- anchor book for lifetime/wrap share cards ---------------- */
function pickAnchorBook() {
  const finished = S.books.filter((b) => b.shelf === "finished").sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""));
  if (finished.length) return finished[0];
  const reading = S.books.filter((b) => b.shelf === "reading").sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
  if (reading.length) return reading[0];
  const fav = S.books.filter((b) => b.fav).sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  if (fav.length) return fav[0];
  const any = S.books.slice().sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  return any[0] || null;
}

/* ---------------- share history (re-share old cards later) ---------------- */
function recordShareHistory(entry) {
  S.shareHistory = S.shareHistory || [];
  S.shareHistory.unshift({ id: uid(), ts: new Date().toISOString(), ...entry });
  if (S.shareHistory.length > 30) S.shareHistory = S.shareHistory.slice(0, 30);
  saveState();
}

/* ---------------- CSV import (Goodreads export format) ---------------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* skip, \n handles the line break */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
function parseGoodreadsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);
  const iTitle = idx("Title"), iAuthor = idx("Author"),
    iRating = idx("My Rating"), iAvgRating = idx("Average Rating"), iPages = idx("Number of Pages"),
    iYear = idx("Original Publication Year") >= 0 ? idx("Original Publication Year") : idx("Year Published"),
    iDateRead = idx("Date Read"), iDateAdded = idx("Date Added"), iShelf = idx("Exclusive Shelf"), iReview = idx("My Review");
  if (iTitle < 0 || iAuthor < 0) return null; // doesn't look like a Goodreads export
  return rows.slice(1).filter((r) => r.length > 1).map((r) => ({
    title: (r[iTitle] || "").trim(),
    author: (r[iAuthor] || "").trim(),
    myRating: parseInt(r[iRating]) || 0,
    avgRating: parseFloat(r[iAvgRating]) || null,
    pages: parseInt(r[iPages]) || null,
    year: parseInt(r[iYear]) || null,
    dateRead: r[iDateRead] || null,
    dateAdded: r[iDateAdded] || null,
    shelf: (r[iShelf] || "").trim(),
    review: (r[iReview] || "").trim(),
  })).filter((b) => b.title);
}
function mapGoodreadsShelf(shelf) {
  if (shelf === "read") return "finished";
  if (shelf === "currently-reading") return "reading";
  return "wishlist"; // "to-read" and any custom shelf both land on the wishlist
}
function importGoodreadsRows(rows) {
  const existing = new Set(S.books.map((b) => (b.t + "::" + b.a).toLowerCase()));
  let imported = 0, skipped = 0;
  for (const r of rows) {
    const key = (r.title + "::" + r.author).toLowerCase();
    if (existing.has(key)) { skipped++; continue; }
    const shelf = mapGoodreadsShelf(r.shelf);
    const readDate = r.dateRead ? new Date(r.dateRead) : null;
    const addedDate = r.dateAdded ? new Date(r.dateAdded) : new Date();
    const validReadDate = readDate && !isNaN(readDate) ? readDate.toISOString() : new Date().toISOString();
    S.books.push({
      id: uid(), t: r.title, a: r.author, p: r.pages || null, y: r.year || null,
      g: [], cover: null, gen: false, shelf,
      addedAt: !isNaN(addedDate) ? addedDate.toISOString() : new Date().toISOString(),
      startedAt: shelf === "reading" || shelf === "finished" ? validReadDate : null,
      finishedAt: shelf === "finished" ? validReadDate : null,
      rating: r.myRating || null,
      review: r.review || null,
      currentPage: shelf === "finished" ? (r.pages || 0) : 0,
      fav: false,
      r: r.avgRating || null,
    });
    existing.add(key);
    imported++;
  }
  saveState();
  return { imported, skipped };
}

/* ---------------- backup ---------------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dogear-backup-${todayStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function importJSON(file, done) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s.books || !s.sessions) throw new Error("bad file");
      S = Object.assign(defaultState(), s);
      saveState();
      done(true);
    } catch { done(false); }
  };
  r.readAsText(file);
}

/* ---------------- misc helpers ---------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let _toastT;
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.remove(), 2600);
}
