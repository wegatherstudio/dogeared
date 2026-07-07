/* ================================================================
   DOGEARED — app.js
   Views, onboarding, timer, journal, monthly wrap, sheets, profile.
================================================================ */
"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const root = $("#app");
const feedRoot = $("#feed-root");

const systemDarkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function resolvedTheme() {
  if (S.settings.theme === "auto") return systemDarkQuery?.matches ? "dark" : "light";
  return S.settings.theme;
}
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#141414" : "#F3F2F7");
}
applyTheme();
systemDarkQuery?.addEventListener?.("change", () => {
  if (S.settings.theme === "auto") { applyTheme(); render(); }
});

const logoChip = (px, imgSize) =>
  `<span class="logo-chip" style="padding:${px}px"><img src="icons/logo.png" alt="" style="width:${imgSize}px;display:block"></span>`;

function avatarSrc(profile) {
  const a = profile?.avatar;
  if (!a) return AVATAR_PRESETS[0].file;
  if (a.startsWith("preset:")) return AVATAR_PRESETS.find((p) => p.id === a.slice(7))?.file || AVATAR_PRESETS[0].file;
  return a; // custom uploaded dataURL
}
const avatarHTML = (size = 56) => `<img class="avatar-mark" src="${avatarSrc(S.profile)}" alt="Your avatar" style="width:${size}px;height:${size}px">`;

/* ================================================================
   ONBOARDING — cinematic, centered, icon-based
================================================================ */
function runOnboarding() {
  let step = 0;
  let googleUser = null;
  const picks = { genres: [], moods: [], goal: 20, name: "" };
  const TOTAL = 5;

  const ob = document.createElement("div");
  ob.className = "onboard";
  document.body.appendChild(ob);

  const draw = () => {
    const prog = `<div class="ob-progress">${Array.from({ length: TOTAL }, (_, i) =>
      `<i class="${i < step ? "done" : i === step ? "now" : ""}"></i>`).join("")}</div>`;

    let body = "", foot = "";
    if (step === 0) {
      body = `<div class="ob-step ob-hero">
        ${logoChip(22, 96)}
        <div class="word">Dogeared</div>
        <div class="tag">Build a reading life.</div>
        <div class="ob-theme-pick">
          <button data-obtheme="light" class="${resolvedTheme() === "light" ? "on" : ""}">${icon("sun", { size: 15 })} Light</button>
          <button data-obtheme="dark" class="${resolvedTheme() === "dark" ? "on" : ""}">${icon("moon", { size: 15 })} Dark</button>
        </div>
      </div>`;
      foot = `<span></span><button class="btn solid" data-next>Let's begin</button>`;
    }
    if (step === 1) {
      body = `<div class="ob-step">
        <div class="eyebrow">Step 1 · Taste</div>
        <h1>What do you love to read?</h1>
        <p class="lede">Pick a few — Dogeared tunes recommendations around these.</p>
        <div class="pick-grid">
          ${GENRES.map((g) => `<button class="pick ${picks.genres.includes(g.id) ? "on" : ""}" data-g="${g.id}">
            <span class="em">${icon(g.ic, { size: 19 })}</span>${g.label}</button>`).join("")}
        </div>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn solid" data-next ${picks.genres.length ? "" : "disabled"}>
          ${picks.genres.length ? `Continue (${picks.genres.length})` : "Pick at least one"}</button>`;
    }
    if (step === 2) {
      body = `<div class="ob-step">
        <div class="eyebrow">Step 2 · Vibe</div>
        <h1>What reading mood are you chasing?</h1>
        <p class="lede">Choose your favorite vibes. We'll match the feeling, not just the shelf label.</p>
        <div class="pick-grid moods">
          ${MOODS.map((m) => `<button class="pick ${picks.moods.includes(m.id) ? "on" : ""}" data-m="${m.id}">
            <span class="em">${icon(m.ic, { size: 19 })}</span>${m.label}</button>`).join("")}
        </div>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn solid" data-next ${picks.moods.length ? "" : "disabled"}>
          ${picks.moods.length ? "Continue" : "Pick at least one"}</button>`;
    }
    if (step === 3) {
      body = `<div class="ob-step" style="text-align:center">
        <div class="eyebrow">Step 3 · Rhythm</div>
        <h1>A daily page intention</h1>
        <p class="lede">Gentle but real. This fills your ring every day.</p>
        <div class="goal-dial"><div class="n" id="goal-n">${picks.goal}</div><div class="u">pages a day</div></div>
        <input type="range" id="goal-range" min="5" max="100" step="5" value="${picks.goal}">
        <div class="goal-chips">
          ${[10, 20, 30, 50].map((v) => `<button data-goal="${v}" class="${picks.goal === v ? "on" : ""}">${v} pages</button>`).join("")}
        </div>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button><button class="btn solid" data-next>Continue</button>`;
    }
    if (step === 4) {
      body = `<div class="ob-step" style="text-align:center">
        <div class="eyebrow">Step 4 · You</div>
        <h1>What should we call you?</h1>
        <p class="lede">${googleUser
          ? `Signed in as ${esc(googleUser.email || "")} — tweak the name below if you'd like.`
          : "Sign in to keep your shelf backed up and synced across devices — or continue as a guest. Either way, your stats and records stay private and safe."}</p>
        ${!googleUser ? `
          <button class="btn solid ob-google-btn" id="ob-google-signin">${typeof GOOGLE_G_SVG !== "undefined" ? GOOGLE_G_SVG : ""} Sign in with Google</button>
          <div class="ob-or">or continue as a guest</div>
        ` : `<div class="ob-signed-chip">${icon("sparkle", { size: 13 })} Signed in with Google</div>`}
        <input id="ob-name" placeholder="Your name or handle" value="${esc(picks.name)}" maxlength="24"
          style="max-width:320px;margin:16px auto 0;text-align:center;font-size:19px;font-family:var(--font-d)">
        <p class="muted small" style="margin-top:14px;max-width:34ch;margin-left:auto;margin-right:auto">Nothing here is ever lost — guest data stays safe on this device, and signed-in data stays safe on your account.</p>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn solid" data-next ${picks.name.trim() ? "" : "disabled"}>Open my library</button>`;
    }

    ob.innerHTML = `<div class="aurora"></div><div class="ob-inner">${prog}${body}<div class="ob-foot">${foot}</div></div>`;

    $$("[data-obtheme]", ob).forEach((b) => b.addEventListener("click", () => {
      S.settings.theme = b.dataset.obtheme;
      saveState(); applyTheme(); draw();
    }));
    $$("[data-g]", ob).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.g;
      picks.genres = picks.genres.includes(id) ? picks.genres.filter((x) => x !== id) : [...picks.genres, id];
      draw();
    }));
    $$("[data-m]", ob).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.m;
      picks.moods = picks.moods.includes(id) ? picks.moods.filter((x) => x !== id) : [...picks.moods, id];
      draw();
    }));
    $("#goal-range", ob)?.addEventListener("input", (e) => {
      picks.goal = +e.target.value;
      $("#goal-n", ob).textContent = picks.goal;
      $$("[data-goal]", ob).forEach((c) => c.classList.toggle("on", +c.dataset.goal === picks.goal));
    });
    $$("[data-goal]", ob).forEach((c) => c.addEventListener("click", () => { picks.goal = +c.dataset.goal; draw(); }));
    $("#ob-name", ob)?.addEventListener("input", (e) => {
      picks.name = e.target.value;
      const next = $("[data-next]", ob);
      if (picks.name.trim()) next.removeAttribute("disabled"); else next.setAttribute("disabled", "");
    });
    $("#ob-google-signin", ob)?.addEventListener("click", () => {
      if (typeof signInWithGoogle !== "function") { toast("Cloud sync isn't set up for this copy of the app yet."); return; }
      signInWithGoogle((user) => {
        googleUser = user;
        picks.name = (user.displayName || "").trim().split(" ")[0] || picks.name;
        draw();
      });
    });
    $("[data-back]", ob)?.addEventListener("click", () => { step--; draw(); });
    $("[data-next]", ob)?.addEventListener("click", () => {
      if (step === 4) {
        S.profile = {
          name: picks.name.trim(), genres: picks.genres, moods: picks.moods,
          dailyGoal: picks.goal, joinedAt: new Date().toISOString(),
        };
        picks.genres.forEach((g) => S.affinity.genres[g] = 2);
        picks.moods.forEach((m) => S.affinity.moods[m] = 2);
        saveState();
        if (googleUser && typeof onSignedIn === "function") onSignedIn(googleUser);
        ob.style.transition = "opacity .5s var(--ease)";
        ob.style.opacity = 0;
        setTimeout(() => { ob.remove(); boot(); }, 480);
        return;
      }
      step++;
      draw();
    });
  };
  draw();
}

/* ================================================================
   NAV / ROUTER
================================================================ */
let currentView = "home";
let libFilter = "reading";
let journalFilter = "all";

function navigate(v) {
  const enteringDiscoverFresh = v === "discover" && currentView !== "discover";
  currentView = v;
  $$("nav.tabbar [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  feedRoot.classList.toggle("hidden", v !== "discover");
  root.classList.toggle("hidden", v === "discover");
  if (enteringDiscoverFresh) feedItems = []; // always reflect the latest wishlist/skip/finished state on a fresh visit
  render();
  updateCtaState();
  if (v !== "discover") window.scrollTo({ top: 0 });
}
function updateCtaState() {
  // the timer tab no longer carries any highlighted/pulsing state —
  // it behaves exactly like every other dock tab, always.
}
function render() {
  if (currentView === "home") renderHome();
  else if (currentView === "discover") renderDiscover();
  else if (currentView === "library") renderLibrary();
  else if (currentView === "journal") renderJournal();
  else if (currentView === "timer") renderTimer();
  else if (currentView === "profile") renderProfile();
}

const topbar = (extra = "") => `
  <div class="topbar">
    <div class="brand">${logoChip(6, 24)}<span class="word">Dogeared</span></div>
    <div style="display:flex;gap:8px">${extra}</div>
  </div>`;

function wireTopbar(scope = document) {
  $("[data-open-search]", scope)?.addEventListener("click", openSearch);
}

/* ================================================================
   HOME
================================================================ */
function renderHome() {
  const g = globalStats();
  const goal = S.profile.dailyGoal;
  const pToday = pagesToday();
  const pct = Math.min(1, pToday / goal);
  const circ = 2 * Math.PI * 50;
  const reading = S.books.filter((b) => b.shelf === "reading");
  const recentJournal = S.journal.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const [q, who] = QUOTES[doy % QUOTES.length];
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Reading past midnight" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const wrapYm = pendingWrapMonth();

  const motivation = pToday >= goal
    ? "Ring closed. The rest of tonight's pages are pure indulgence."
    : pToday > 0
    ? `${goal - pToday} pages to close your ring. One chapter should do it.`
    : g.streak > 0
    ? `Your ${g.streak}-day ritual is warm. Five minutes keeps the flame.`
    : "Every reading life starts with one page. Today's is waiting.";

  root.innerHTML = `
    ${topbar(`<button class="iconbtn" data-open-search title="Search books">${icon("search", { size: 18 })}</button>`)}
    <div class="view">
      ${wrapYm ? `<div class="wrap-banner" data-open-wrap="${wrapYm}">
        <div class="wrap-banner-shine"></div>
        <div class="wrap-banner-ic">${icon("sparkle", { size: 22 })}</div>
        <div style="flex:1;position:relative;z-index:1">
          <div class="wrap-banner-eyebrow">Your wrap is ready</div>
          <div class="wrap-banner-title">${monthLabel(wrapYm)}, recapped</div>
        </div>
        <span class="wrap-banner-cta">View ${icon("chev_r", { size: 13 })}</span>
      </div>` : ""}

      <div class="hello rise"><div class="hi">${greet}</div><h1>${esc(S.profile.name)}</h1></div>

      <div class="card eared ring-card rise d1" style="margin-top:16px">
        <div class="ring-wrap">
          <svg width="118" height="118" viewBox="0 0 118 118">
            <circle class="ring-bg" cx="59" cy="59" r="50" fill="none" stroke-width="11"/>
            <circle class="ring-fg" cx="59" cy="59" r="50" fill="none" stroke-width="11"
              stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"/>
          </svg>
          <div class="ring-center"><div class="n">${pToday}</div><div class="u">/ ${goal} pages</div></div>
        </div>
        <div style="flex:1">
          <div class="eyebrow">Today's ring</div>
          <p style="font-size:14.5px;line-height:1.5">${motivation}</p>
        </div>
      </div>

      <div class="pillstats rise d2">
        <div class="pillstat"><div class="n">${icon("flame", { size: 16 })} ${g.streak}</div><div class="l">day streak</div></div>
        <div class="pillstat"><div class="n">${pagesThisWeek()}</div><div class="l">pages this week</div></div>
        <div class="pillstat"><div class="n">${g.finished}</div><div class="l">books finished</div></div>
      </div>

      ${reading.length ? `<div class="eyebrow rise d2" style="margin:14px 0 10px">Currently reading</div>` +
        reading.map((b) => {
          const pc = b.p ? Math.min(100, Math.round((b.currentPage || 0) / b.p * 100)) : 0;
          const eta = estimateFinish(b);
          return `<div class="card eared now-card rise d3" data-book="${b.id}">
            ${coverHTML(b)}
            <div class="meta">
              <div class="t">${esc(b.t)}</div><div class="a">${esc(b.a)}</div>
              <div class="progress-line"><div class="fill" style="width:${pc}%"></div></div>
              <div class="muted small" style="margin-top:6px">${pc}% · ${b.p ? `${b.p - (b.currentPage || 0)} pages left` : "pages unknown"}${eta ? ` · done ~${eta}` : ""}</div>
            </div>
            <button class="btn sm solid" data-read="${b.id}" style="align-self:center">Read</button>
          </div>`;
        }).join("")
        : `<div class="card empty rise d3">
            ${logoChip(16, 70)}
            <div class="serif">Nothing on the nightstand.</div>
            <p>Find your next book in Discover — it already knows your taste.</p>
            <button class="btn solid" data-go-discover style="margin-top:10px">Open Discover</button>
          </div>`}

      <div class="card rise d3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span class="eyebrow" style="margin:0">Journal</span>
          <button class="btn sm ghost" id="home-j-new">${icon("plus", { size: 13 })} New entry</button>
        </div>
        ${recentJournal.length ? recentJournal.map((j) => {
            const b = j.bookId ? S.books.find((x) => x.id === j.bookId) : null;
            const kd = JOURNAL_KINDS.find((k) => k.id === j.kind) || JOURNAL_KINDS[0];
            return `<div class="mini-entry">
              <div class="je-top">
                <span class="chip gold">${icon(kd.ic, { size: 11 })} ${kd.label}</span>
                <span class="muted small">${fmtDateNice(j.createdAt)}${b ? " · " + esc(b.t) : " · freeform"}</span>
              </div>
              <p style="font-family:var(--font-d);font-size:15px;margin-top:6px;${j.kind === "quote" ? "font-style:italic" : ""}">${j.kind === "quote" ? "❝ " : ""}${esc(entryPreviewText(j))}${j.kind === "quote" ? " ❞" : ""}</p>
              <div class="btn-row"><button class="btn quiet sm" data-home-jedit="${j.id}">Edit</button></div>
            </div>`;
          }).join("")
          : `<p class="muted small">Reflections, character notes, close reads, quotes worth keeping — they'll live here.</p>`}
        ${S.journal.length ? `<div class="btn-row"><button class="btn quiet sm" id="home-j-all">See all entries</button></div>` : ""}
      </div>

      <div class="card eared quote-block rise d4">
        <div class="q">"${esc(q)}"</div><div class="w">— ${esc(who)}</div>
      </div>
    </div>`;

  wireTopbar(root);
  $$("[data-open-wrap]", root).forEach((el) => el.addEventListener("click", () => openMonthlyWrap(el.dataset.openWrap)));
  $("[data-go-discover]", root)?.addEventListener("click", () => navigate("discover"));
  $("#home-j-new")?.addEventListener("click", () => openJournalEditor());
  $("#home-j-all")?.addEventListener("click", () => navigate("journal"));
  $$("[data-home-jedit]", root).forEach((b) => b.addEventListener("click", () => {
    const entry = S.journal.find((j) => j.id === b.dataset.homeJedit);
    if (entry) openJournalEditor({ entry });
  }));
  $$("[data-read]", root).forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation(); startTimer(b.dataset.read); navigate("timer");
  }));
  $$("[data-book]", root).forEach((el) => el.addEventListener("click", () => openBookSheet(el.dataset.book)));
}

/* ================================================================
   DISCOVER — vertical snap feed
================================================================ */
let feedItems = [];
let feedShownIds = new Set(); // this session's shown items — "Deal me more" never repeats these
function findCandidate(id) { return allCandidates().find((c) => c.id === id); }

function renderDiscover() {
  if (!feedItems.length) {
    feedItems = recommendationFeed(8);
    feedItems.forEach((c) => feedShownIds.add(c.id));
  }
  feedRoot.innerHTML = `
    <div class="feed" id="feed">
      <div class="feed-hint">Swipe for your next book</div>
      ${feedItems.map(feedCardHTML).join("")}
      <div class="feed-card" id="feed-more">
        <div class="bgwash" style="background:var(--ochre)"></div>
        <div class="fc-inner">
          <div class="fc-content">
            <div class="fc-title serif">Still curious?</div>
            <p class="fc-blurb">The more you read, save, and skip, the sharper this feed gets.</p>
            <button class="btn main" data-more>${icon("refresh", { size: 16 })} Deal me more</button>
          </div>
        </div>
      </div>
    </div>
    <div class="feed-topbtns">
      <button class="iconbtn" data-open-search title="Search">${icon("search", { size: 18 })}</button>
    </div>`;

  wireTopbar(feedRoot);
  const feedEl = $("#feed");
  wireFeedActions(feedEl);
  resolveCoversFor(feedItems, feedEl);

  $("[data-more]", feedRoot)?.addEventListener("click", (e) => appendMoreFeed(e.currentTarget));
}

function fitTitleSize(t) {
  const len = (t || "").length;
  if (len > 60) return 19;
  if (len > 42) return 21;
  if (len > 28) return 23;
  return 25;
}
function fitAuthorSize(a) {
  const len = (a || "").length;
  if (len > 42) return 11.5;
  if (len > 28) return 12.5;
  return 13.5;
}
function feedCardHTML(cb) {
  const hue = GENRE_HUES[cb.g[0]] || "#4A4A4E";
  const gl = cb.g.map((g) => GENRES.find((x) => x.id === g)?.label).filter(Boolean);
  const authorLine = `${cb.a || "Unknown author"}${cb.y ? " · " + cb.y : ""}`;
  return `<div class="feed-card" data-fc="${cb.id}">
    <div class="bgwash" style="background:${hue}"></div>
    <div class="bgcover"${cb.cover ? ` style="background-image:url(${cb.cover})"` : ""}></div>
    <div class="fc-inner">
      <div class="fc-content">
        ${cb.cover ? `<img class="cover xl fc-cover" src="${cb.cover}" alt="">` : genCoverHTML(cb, "cover xl fc-cover")}
        <div class="fc-title" style="font-size:${fitTitleSize(cb.t)}px">${esc(cb.t)}</div>
        <div class="fc-author" style="font-size:${fitAuthorSize(authorLine)}px">${esc(authorLine)}</div>
        <div class="fc-meta">
          ${cb.r ? `<span class="chip">★ ${cb.r}</span>` : ""}
          ${cb.p ? `<span class="chip">${cb.p} pages</span>` : ""}
          ${gl.slice(0, 2).map((l) => `<span class="chip">${l}</span>`).join("")}
        </div>
        <div class="fc-blurb">${cb.b ? esc(cb.b) : "An Open Library pick, matched to your taste — tap Start to learn more as you go."}</div>
        <div class="fc-why">${esc(whyForYou(cb))}</div>
      </div>
      <div class="fc-actions">
        <button class="btn main" data-fc-start="${cb.id}">Start reading</button>
        <button class="btn" data-fc-save="${cb.id}">${icon("plus", { size: 12 })} Wishlist</button>
        <button class="btn" data-fc-skip="${cb.id}">Skip</button>
      </div>
    </div>
  </div>`;
}

function wireFeedActions(scope) {
  $$("[data-fc-start]", scope).forEach((b) => b.addEventListener("click", () => {
    const cb = findCandidate(b.dataset.fcStart);
    if (!cb) return;
    const book = addBookFromCatalog(cb, "reading");
    toast(`"${cb.t}" is now on your nightstand.`);
    checkAchievements(); saveState();
    removeCardFromFeed(cb.id);
    openBookSheet(book.id);
  }));
  $$("[data-fc-save]", scope).forEach((b) => b.addEventListener("click", () => {
    const cb = findCandidate(b.dataset.fcSave);
    if (!cb) return;
    addBookFromCatalog(cb, "wishlist");
    saveState();
    toast("Saved to your wishlist.");
    b.innerHTML = `${icon("plus", { size: 14 })} Saved`; b.disabled = true;
  }));
  $$("[data-fc-skip]", scope).forEach((b) => b.addEventListener("click", () => {
    const cb = findCandidate(b.dataset.fcSkip);
    if (!cb) return;
    learnFrom(cb, "skip");
    if (!S.seenFeed.includes(cb.id)) S.seenFeed.push(cb.id);
    saveState();
    toast("Won't show that one again.");
    removeCardFromFeed(cb.id);
  }));
}

/* removes a card from both the live DOM and the in-memory feed list, so
   the Discover session reflects the action immediately — no waiting for
   a full re-render, and it won't come back if you scroll away and back
   within the same visit either. */
function removeCardFromFeed(id) {
  feedItems = feedItems.filter((c) => c.id !== id);
  const card = document.querySelector(`.feed-card[data-fc="${id}"]`);
  if (!card) return;
  const feedEl = card.closest(".feed");
  card.style.transition = "opacity .2s ease";
  card.style.opacity = "0";
  card.style.pointerEvents = "none";
  setTimeout(() => {
    // Removing an earlier card shifts everything after it up by exactly its
    // own height. Keeping scrollTop numerically unchanged (rather than
    // scrolling programmatically) means the next card slides straight into
    // the removed one's place — no jump, and critically, no risk of
    // overshooting past an extra card the way an animated scrollIntoView
    // call racing against this removal used to cause.
    const scrollTopBefore = feedEl ? feedEl.scrollTop : 0;
    card.remove();
    if (feedEl) feedEl.scrollTop = scrollTopBefore;
  }, 200);
}

function resolveCoversFor(items, scope) {
  items.forEach((cb) => {
    if (cb.cover) return; // already have a real cover, nothing to resolve
    resolveCatalogCover(cb).then((url) => {
      if (!url) return;
      const card = $(`[data-fc="${cb.id}"]`, scope || feedRoot);
      if (!card) return;
      $(".bgcover", card).style.backgroundImage = `url(${url})`;
      const cov = $(".fc-cover", card);
      if (cov) cov.outerHTML = `<img class="cover xl fc-cover" src="${url}" alt="">`;
    });
  });
}

/* "Deal me more" — appends fresh, never-shown books in place (no scroll jump),
   and pulls new candidates live from Open Library once the local pool runs low. */
async function appendMoreFeed(btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = `${icon("refresh", { size: 16 })} Finding more…`; }
  if (poolRemaining(feedShownIds) < 6) {
    await expandRemoteCatalog();
  }
  const newItems = recommendationFeed(8, feedShownIds);
  if (btn) { btn.disabled = false; btn.innerHTML = `${icon("refresh", { size: 16 })} Deal me more`; }
  if (!newItems.length) { toast("That's everything we've got for now — read or wishlist a few more to unlock fresh picks."); return; }
  newItems.forEach((c) => feedShownIds.add(c.id));
  const moreCard = $("#feed-more");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = newItems.map(feedCardHTML).join("");
  const nodes = [...wrapper.children];
  wireFeedActions(wrapper);
  nodes.forEach((n) => moreCard.parentNode.insertBefore(n, moreCard));
  feedItems = feedItems.concat(newItems);
  resolveCoversFor(newItems, $("#feed"));
  nodes[0]?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ================================================================
   SEARCH (Open Library) — sticky search bar within the sheet
================================================================ */
function openSearch() {
  openSheet(`
    <div class="search-head sticky">
      <input id="q" placeholder="Title, author, ISBN, theme…" autocomplete="off">
      <button class="btn sm solid" id="go">${icon("search", { size: 15 })}</button>
    </div>
    <div id="results">
      <p class="muted" style="text-align:center;padding:20px 10px">
        Search millions of books via Open Library.${navigator.onLine ? "" : " (You look offline — results need a connection, but you can still add books manually.)"}
      </p>
      <div style="text-align:center"><button class="btn ghost sm" id="manual-add">Add a book manually</button></div>
    </div>
  `, (sheet) => {
    const input = $("#q", sheet), results = $("#results", sheet);
    input.focus();
    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;
      results.innerHTML = Array.from({ length: 4 }, () =>
        `<div class="skeleton" style="height:96px;margin-bottom:12px"></div>`).join("");
      try {
        const docs = await olSearch(q);
        if (!docs.length) { results.innerHTML = `<p class="muted" style="text-align:center;padding:24px">Nothing found. Try fewer words?</p>`; return; }
        results.innerHTML = docs.map((d, i) => `
          <div class="card result-row" data-i="${i}">
            ${d.cover ? `<img class="cover" src="${d.cover.replace("-L.jpg", "-M.jpg")}" loading="lazy">` : genCoverHTML(d)}
            <div class="meta">
              <div class="t">${esc(d.t)}</div>
              <div class="a">${esc(d.a)}${d.y ? " · " + d.y : ""}</div>
              <div class="muted small" style="margin-top:4px">
                ${d.r ? `★ ${d.r} · ` : ""}${d.p ? d.p + " pages" : ""}
              </div>
            </div>
          </div>`).join("");
        $$("[data-i]", results).forEach((el) => el.addEventListener("click", () => {
          openSearchResult(docs[+el.dataset.i]);
        }));
      } catch {
        results.innerHTML = `<p class="muted" style="text-align:center;padding:24px">Couldn't reach the library. Check your connection, or add the book manually.</p>
        <div style="text-align:center"><button class="btn ghost sm" id="manual-add2">Add manually</button></div>`;
        $("#manual-add2", results)?.addEventListener("click", () => openManualAdd());
      }
    };
    $("#go", sheet).addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    $("#manual-add", sheet)?.addEventListener("click", () => openManualAdd());
  });
}

function openSearchResult(d) {
  openSheet(`
    <div class="bd-hero">
      <div class="halo"></div>
      ${d.cover ? `<img class="cover xl" src="${d.cover}">` : genCoverHTML(d, "cover xl")}
      <h2>${esc(d.t)}</h2><div class="a">${esc(d.a)}${d.y ? " · " + d.y : ""}</div>
      <div class="chips">
        ${d.r ? `<span class="chip gold">★ ${d.r} community</span>` : ""}
        ${d.p ? `<span class="chip">${d.p} pages</span>` : ""}
        ${d.p ? `<span class="chip">~${Math.round(d.p / 38)}h read</span>` : ""}
        ${d.g.map((g) => `<span class="chip">${GENRES.find((x) => x.id === g)?.label || g}</span>`).join("")}
      </div>
    </div>
    <p class="muted" id="syn" style="text-align:center;padding:6px 8px 0">Fetching synopsis…</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn solid" data-add="reading">Start reading</button>
      <button class="btn ghost" data-add="wishlist">${icon("plus", { size: 14 })} Wishlist</button>
      <button class="btn ghost" data-add="finished">Already read it</button>
    </div>
  `, (sheet) => {
    olWorkDescription(d.olKey).then((desc) => {
      $("#syn", sheet).textContent = desc || "No synopsis on file — all the more mystery.";
    });
    $$("[data-add]", sheet).forEach((b) => b.addEventListener("click", () => {
      const shelf = b.dataset.add;
      const book = {
        id: uid(), catalogId: null, t: d.t, a: d.a, p: d.p, y: d.y,
        g: d.g, m: [], r: d.r, b: "", cover: d.cover, olKey: d.olKey,
        shelf, addedAt: new Date().toISOString(),
        startedAt: shelf === "reading" ? new Date().toISOString() : null,
        finishedAt: shelf === "finished" ? new Date().toISOString() : null,
        rating: 0, review: "", currentPage: shelf === "finished" && d.p ? d.p : 0, fav: false,
      };
      S.books.push(book);
      bump("genres", d.g, shelf === "wishlist" ? 1.2 : 1.6);
      if (shelf === "finished") grantXP(XP_RULES.finishBook / 3, "Logged a finished book");
      checkAchievements();
      saveState();
      closeSheet();
      toast(shelf === "reading" ? "On the nightstand. Go get lost." : shelf === "wishlist" ? "Wishlisted." : "Shelved with honors.");
      render();
    }));
  });
}

function openManualAdd(existing) {
  const b = existing;
  openSheet(`
    <h2 style="margin-bottom:14px">${b ? "Edit book" : "Add a book"}</h2>
    <label class="field"><span>Title</span><input id="mb-t" value="${esc(b?.t || "")}"></label>
    <label class="field"><span>Author</span><input id="mb-a" value="${esc(b?.a || "")}"></label>
    <label class="field"><span>Total pages</span><input id="mb-p" type="number" min="1" value="${b?.p || ""}"></label>
    <label class="field"><span>Genre</span>
      <select id="mb-g">${GENRES.map((g) => `<option value="${g.id}" ${b?.g?.[0] === g.id ? "selected" : ""}>${g.label}</option>`).join("")}</select></label>
    ${b ? "" : `<label class="field"><span>Shelf</span>
      <select id="mb-s"><option value="reading">Currently reading</option><option value="wishlist">Wishlist</option><option value="finished">Finished</option></select></label>`}
    <div class="btn-row">
      <button class="btn solid" id="mb-save">${b ? "Save" : "Add book"}</button>
      ${b ? `<button class="btn quiet" id="mb-del" style="color:var(--ember)">Remove from library</button>` : ""}
    </div>
  `, (sheet) => {
    $("#mb-save", sheet).addEventListener("click", () => {
      const t = $("#mb-t", sheet).value.trim();
      if (!t) { toast("A title, at least."); return; }
      if (b) {
        b.t = t; b.a = $("#mb-a", sheet).value.trim();
        b.p = parseInt($("#mb-p", sheet).value, 10) || b.p;
        b.g = [$("#mb-g", sheet).value];
        saveState(); closeSheet(); render(); toast("Updated.");
      } else {
        const shelf = $("#mb-s", sheet).value;
        const nb = {
          id: uid(), catalogId: null, t, a: $("#mb-a", sheet).value.trim(),
          p: parseInt($("#mb-p", sheet).value, 10) || null, y: null,
          g: [$("#mb-g", sheet).value], m: [], r: null, b: "", cover: null, olKey: null,
          shelf, addedAt: new Date().toISOString(),
          startedAt: shelf === "reading" ? new Date().toISOString() : null,
          finishedAt: shelf === "finished" ? new Date().toISOString() : null,
          rating: 0, review: "", currentPage: 0, fav: false,
        };
        S.books.push(nb); saveState(); resolveCover(nb);
        closeSheet(); render(); toast("Added to your library.");
      }
      checkAchievements(); saveState();
    });
    $("#mb-del", sheet)?.addEventListener("click", () => {
      if (!confirm("Remove this book? Its sessions stay in your stats.")) return;
      S.books = S.books.filter((x) => x.id !== b.id);
      saveState(); closeSheet(); render();
    });
  });
}

/* ================================================================
   LIBRARY
================================================================ */
const SHELF_DEFS = [
  ["reading", "Currently reading"],
  ["finished", "Finished"],
  ["wishlist", "Wishlist"],
  ["favorites", "Favorites"],
  ["dropped", "Dropped"],
];

function renderLibrary() {
  const books = (libFilter === "favorites"
    ? S.books.filter((b) => b.fav)
    : S.books.filter((b) => b.shelf === libFilter)
  ).sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

  root.innerHTML = `
    ${topbar(`<button class="iconbtn" data-open-search title="Search books">${icon("search", { size: 18 })}</button>`)}
    <div class="view">
      <h1 style="margin-bottom:14px">Library</h1>
      <div class="seg">
        ${SHELF_DEFS.map(([k, l]) => `<button data-f="${k}" class="${k === libFilter ? "active" : ""}">${l}</button>`).join("")}
      </div>
      ${books.length ? `<div class="shelf-grid">
        ${books.map((b) => {
          const pc = b.p ? Math.min(100, Math.round((b.currentPage || 0) / b.p * 100)) : 0;
          return `<div class="shelf-item" data-book="${b.id}">
            ${coverHTML(b, "cover")}
            <div class="t serif">${esc(b.t)}</div>
            <div class="sub">${b.shelf === "finished" && b.rating ? "★".repeat(b.rating) : esc(b.a || "")}</div>
            ${b.shelf === "reading" ? `<div class="mini-progress"><i style="width:${pc}%"></i></div>` : ""}
          </div>`;
        }).join("")}
      </div>` : `
      <div class="card empty">
        ${logoChip(16, 70)}
        <div class="serif">${{
          reading: "Nothing open right now.",
          finished: "Finished books gather here, dog-eared and loved.",
          wishlist: "The wishlist awaits its first temptation.",
          favorites: "Mark the books that marked you.",
          dropped: "No abandoned books. (It's allowed, though.)",
        }[libFilter]}</div>
        <button class="btn solid" data-go-discover style="margin-top:12px">Find a book</button>
      </div>`}
    </div>`;

  wireTopbar(root);
  $$("[data-f]", root).forEach((b) => b.addEventListener("click", () => { libFilter = b.dataset.f; renderLibrary(); }));
  $$("[data-book]", root).forEach((el) => el.addEventListener("click", () => openBookSheet(el.dataset.book)));
  $("[data-go-discover]", root)?.addEventListener("click", () => navigate("discover"));
}

/* ================================================================
   JOURNAL — reflective writing, per-book & freeform
================================================================ */
/* entry content helpers — support both the new rich-html entries and
   legacy plain-text+images entries created before this editor existed */
function entryBodyHTML(j) {
  if (j.html) return j.html;
  const t = j.kind === "quote" ? "❝ " + esc(j.text) + " ❞" : esc(j.text).replace(/\n/g, "<br>");
  const imgs = j.images?.length ? `<div class="imgs">${j.images.map((src) => `<img src="${src}" alt="">`).join("")}</div>` : "";
  return t + imgs;
}
function entryPreviewText(j, max = 130) {
  let text;
  if (j.html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = j.html;
    text = tmp.textContent.trim() || (tmp.querySelector("img") ? "📷 A photo, kept without words." : "");
  } else {
    text = j.text || "";
  }
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text;
}

let journalBookQuery = "";
function journalFilteredEntries() {
  return S.journal
    .filter((j) => {
      if (journalFilter === "all") { /* pass */ }
      else if (journalFilter === "free") { if (j.bookId) return false; }
      else if (JOURNAL_KINDS.some((k) => k.id === journalFilter)) { if (j.kind !== journalFilter) return false; }
      if (journalBookQuery) {
        const b = j.bookId ? S.books.find((x) => x.id === j.bookId) : null;
        const hay = (b ? b.t + " " + (b.a || "") : "freeform").toLowerCase();
        if (!hay.includes(journalBookQuery.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function journalEntriesListHTML(entries) {
  if (!entries.length) {
    return `<div class="card empty">
      ${logoChip(16, 70)}
      <div class="serif">${journalBookQuery || journalFilter !== "all" ? "Nothing matches yet." : "The margins are all yours."}</div>
      <p>${journalBookQuery || journalFilter !== "all" ? "Try a different search or filter." : "Reflections, character notes, close reads, quotes worth keeping — they live here."}</p>
      ${!journalBookQuery && journalFilter === "all" ? `<button class="btn solid" id="j-first">Write your first entry</button>` : ""}
    </div>`;
  }
  return entries.map((j) => {
    const b = j.bookId ? S.books.find((x) => x.id === j.bookId) : null;
    const kd = JOURNAL_KINDS.find((k) => k.id === j.kind) || JOURNAL_KINDS[0];
    return `<div class="card eared journal-entry">
      <div class="je-top">
        <span class="chip gold">${icon(kd.ic, { size: 12 })} ${kd.label}</span>
        <span class="muted small">${fmtDateNice(j.createdAt)}${b ? " · " + esc(b.t) : " · freeform"}</span>
      </div>
      ${j.prompt ? `<div class="muted small je-prompt">${esc(j.prompt)}</div>` : ""}
      <div class="body rich-body">${entryBodyHTML(j)}</div>
      <div class="btn-row"><button class="btn quiet sm" data-jedit="${j.id}">Edit</button></div>
    </div>`;
  }).join("");
}
function wireJournalEntryButtons() {
  $("#j-first")?.addEventListener("click", () => openJournalEditor());
  $$("[data-jedit]", root).forEach((b) => b.addEventListener("click", () => {
    const entry = S.journal.find((j) => j.id === b.dataset.jedit);
    if (entry) openJournalEditor({ entry });
  }));
}
function updateJournalSuggestions() {
  const box = $("#j-suggest", root);
  if (!box) return;
  const q = journalBookQuery.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; return; }
  const booksWithEntries = [...new Set(S.journal.map((j) => j.bookId).filter(Boolean))].map((id) => S.books.find((b) => b.id === id)).filter(Boolean);
  const matches = booksWithEntries.filter((b) => (b.t + " " + (b.a || "")).toLowerCase().includes(q) && b.t.toLowerCase() !== q).slice(0, 4);
  box.innerHTML = matches.length ? matches.map((b) => `<button class="j-suggest-chip" data-suggest="${esc(b.t)}">${icon("book", { size: 12 })} ${esc(b.t)}</button>`).join("") : "";
  $$("[data-suggest]", box).forEach((btn) => btn.addEventListener("click", () => {
    journalBookQuery = btn.dataset.suggest;
    $("#j-search", root).value = journalBookQuery;
    refreshJournalList();
  }));
}
function refreshJournalList() {
  const entries = journalFilteredEntries();
  $("#j-entries-list", root).innerHTML = journalEntriesListHTML(entries);
  updateJournalSuggestions();
  wireJournalEntryButtons();
}

function renderJournal() {
  const entries = journalFilteredEntries();

  root.innerHTML = `
    ${topbar(`<button class="iconbtn" data-back-home title="Back to Home">${icon("chev_l", { size: 18 })}</button>`)}
    <div class="view">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h1>Journal</h1>
        <button class="btn sm solid" id="j-new">${icon("plus", { size: 14 })} New entry</button>
      </div>
      <p class="muted" style="margin:-8px 0 14px">A private space for how books actually land — beyond the star rating.</p>
      <div class="search-head" style="margin-bottom:6px">
        <input id="j-search" placeholder="Find entries by book title or author…" value="${esc(journalBookQuery)}">
      </div>
      <div class="j-suggest-row" id="j-suggest"></div>
      <div class="seg">
        <button data-jf="all" class="${journalFilter === "all" ? "active" : ""}">All</button>
        <button data-jf="free" class="${journalFilter === "free" ? "active" : ""}">Freeform</button>
        ${JOURNAL_KINDS.map((k) => `<button data-jf="${k.id}" class="${journalFilter === k.id ? "active" : ""}">${icon(k.ic, { size: 13 })} ${k.label}</button>`).join("")}
      </div>
      <div id="j-entries-list">${journalEntriesListHTML(entries)}</div>
    </div>`;

  wireTopbar(root);
  $("[data-back-home]", root)?.addEventListener("click", () => navigate("home"));
  $("#j-new")?.addEventListener("click", () => openJournalEditor());
  $("#j-search", root).addEventListener("input", (e) => { journalBookQuery = e.target.value; refreshJournalList(); });
  $$("[data-jf]", root).forEach((b) => b.addEventListener("click", () => { journalFilter = b.dataset.jf; renderJournal(); }));
  updateJournalSuggestions();
  wireJournalEntryButtons();
}

/* ---------------- full-screen, Notion-style diary editor ---------------- */
function openJournalEditor(opts = {}) {
  const { bookId = null, presetKind = null, entry = null } = opts;
  let kind = entry ? entry.kind : (presetKind || "reflection");
  let chosenPrompt = entry ? entry.prompt : null;
  let selectedBookId = entry ? entry.bookId : bookId;
  let pickerMode = selectedBookId ? "book" : "free";
  let bookQuery = "";
  const isEdit = !!entry;
  const promptsFor = (k) => k === "reflection" ? EMOTIONAL_PROMPTS : k === "character" ? CHARACTER_PROMPTS : k === "analysis" ? ANALYSIS_PROMPTS : [];
  const journalable = () => S.books.filter((b) => b.shelf === "reading" || b.shelf === "finished");

  const el = document.createElement("div");
  el.className = "journal-fs";
  document.body.appendChild(el);

  const selectedBook = () => selectedBookId ? S.books.find((x) => x.id === selectedBookId) : null;
  const initialContent = entry ? (entry.html || (entry.text ? esc(entry.text).replace(/\n/g, "<br>") + (entry.images || []).map((s) => `<br><img src="${s}">`).join("") : "")) : "";
  bookQuery = selectedBook() ? selectedBook().t : "";

  const draw = () => {
    const prompts = promptsFor(kind);
    el.innerHTML = `
      <div class="jfs-top">
        <button class="iconbtn" id="jfs-close">${icon("x", { size: 16 })}</button>
        <div class="jfs-book-picker">
          <select id="jfs-mode">
            <option value="free" ${pickerMode === "free" ? "selected" : ""}>Freeform</option>
            <option value="book" ${pickerMode === "book" ? "selected" : ""}>Select a book</option>
          </select>
        </div>
        <button class="btn sm solid" id="jfs-save">${isEdit ? "Save" : "Keep this"}</button>
      </div>
      ${pickerMode === "book" ? `
      <div class="jfs-book-search">
        <input id="jfs-book-q" placeholder="Search reading & finished books…" value="${esc(bookQuery)}" autocomplete="off">
        <div id="jfs-book-results"></div>
      </div>` : ""}
      <div class="kind-row jfs-kinds">
        ${JOURNAL_KINDS.map((k) => `<button data-k="${k.id}" class="${kind === k.id ? "active" : ""}">${icon(k.ic, { size: 14 })} ${k.label}</button>`).join("")}
      </div>
      ${prompts.length ? `<div class="prompt-pills jfs-prompts">
        ${prompts.map((p, i) => `<button data-prompt="${i}" class="${chosenPrompt === p ? "on" : ""}">${esc(p)}</button>`).join("")}
      </div>` : ""}
      <div class="jfs-page">
        <div id="jfs-editor" class="jfs-editor" contenteditable="true" data-placeholder="${kind === "quote" ? "The line you'd copy into a notebook…" : JOURNAL_KINDS.find((k) => k.id === kind).hint}">${initialContent}</div>
      </div>
      <div class="jfs-toolbar">
        <button class="btn ghost sm" id="jfs-img-btn">${icon("camera", { size: 14 })} Insert image</button>
        <input id="jfs-img-file" type="file" accept="image/*" multiple class="hidden">
        <span class="muted small">Paste an image right into the page, too</span>
        ${isEdit ? `<button class="btn quiet sm" id="jfs-del" style="color:var(--ember);margin-left:auto">Delete</button>` : ""}
      </div>
    `;

    $("#jfs-close", el).addEventListener("click", closeEditor);
    $("#jfs-mode", el).addEventListener("change", (e) => {
      pickerMode = e.target.value;
      if (pickerMode === "free") { selectedBookId = null; bookQuery = ""; }
      draw();
      if (pickerMode === "book") $("#jfs-book-q", el)?.focus();
    });
    $$("[data-k]", el).forEach((b) => b.addEventListener("click", () => { kind = b.dataset.k; chosenPrompt = null; draw(); }));
    $$("[data-prompt]", el).forEach((b) => b.addEventListener("click", () => {
      chosenPrompt = prompts[+b.dataset.prompt];
      draw();
      $("#jfs-editor", el).focus();
    }));

    const bookQ = $("#jfs-book-q", el);
    const drawBookResults = () => {
      const resultsEl = $("#jfs-book-results", el);
      if (!resultsEl) return;
      const q = bookQuery.trim().toLowerCase();
      const pool = journalable();
      const matches = q
        ? pool.filter((b) => (b.t + " " + (b.a || "")).toLowerCase().includes(q)).slice(0, 6)
        : pool.slice().sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || "")).slice(0, 6);
      resultsEl.innerHTML = matches.length
        ? matches.map((b) => `<div class="jbp-row ${selectedBookId === b.id ? "on" : ""}" data-pick="${b.id}">
            ${coverHTML(b, "cover")}<span>${esc(b.t)}<br><span class="muted small">${esc(b.a || "")} · ${b.shelf === "finished" ? "finished" : "reading"}</span></span>
          </div>`).join("")
        : `<p class="muted small" style="padding:10px 4px">${q ? `No reading or finished books match "${esc(bookQuery)}".` : "Nothing on your reading or finished shelves yet."}</p>`;
      $$("[data-pick]", resultsEl).forEach((row) => row.addEventListener("click", () => {
        const b = S.books.find((x) => x.id === row.dataset.pick);
        if (!b) return;
        selectedBookId = b.id; bookQuery = b.t;
        bookQ.value = b.t;
        drawBookResults();
      }));
    };
    if (bookQ) {
      drawBookResults();
      bookQ.addEventListener("input", (e) => { bookQuery = e.target.value; selectedBookId = null; drawBookResults(); });
    }

    const editor = $("#jfs-editor", el);
    editor.addEventListener("paste", async (e) => {
      const items = [...(e.clipboardData?.items || [])];
      const imgItem = items.find((it) => it.type.startsWith("image/"));
      if (!imgItem) return; // let normal text paste happen
      e.preventDefault();
      const file = imgItem.getAsFile();
      const dataURL = await fileToDataURL(file, 720, 0.82);
      insertImageAtCursor(editor, dataURL);
    });
    $("#jfs-img-btn", el).addEventListener("click", () => $("#jfs-img-file", el).click());
    $("#jfs-img-file", el).addEventListener("change", async (e) => {
      for (const f of e.target.files) {
        const dataURL = await fileToDataURL(f, 720, 0.82);
        insertImageAtCursor(editor, dataURL);
      }
      e.target.value = "";
    });

    $("#jfs-save", el).addEventListener("click", () => {
      const html = $("#jfs-editor", el).innerHTML.trim();
      const plain = $("#jfs-editor", el).textContent.trim();
      const hasImage = /<img/i.test(html);
      if (!plain && !hasImage) { toast("A few words, or a photo — something to keep."); return; }
      if (isEdit) {
        Object.assign(entry, { bookId: selectedBookId, kind, prompt: chosenPrompt, html, text: plain, images: [] });
        saveState(); closeEditor(); toast("Updated.");
      } else {
        const deep = kind === "analysis" || kind === "character";
        S.journal.push({ id: uid(), bookId: selectedBookId, kind, prompt: chosenPrompt, html, text: plain, images: [], createdAt: new Date().toISOString() });
        grantXP(deep ? XP_RULES.deepJournalEntry : XP_RULES.journalEntry, "Journal: " + kind);
        checkAchievements(); saveState(); closeEditor();
        toast(kind === "quote" ? "Pressed between the pages." : "Noted, carefully.");
      }
      render();
    });
    $("#jfs-del", el)?.addEventListener("click", () => {
      if (!confirm("Remove this entry for good?")) return;
      S.journal = S.journal.filter((j) => j.id !== entry.id);
      saveState(); closeEditor(); render();
    });
  };

  function insertImageAtCursor(editor, dataURL) {
    editor.focus();
    const img = `<img src="${dataURL}" style="max-width:100%;border-radius:10px;margin:10px 0;display:block">`;
    if (document.queryCommandSupported && document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, img + "<br>");
    } else {
      editor.innerHTML += img + "<br>";
    }
  }

  function closeEditor() {
    el.remove();
    document.removeEventListener("keydown", escHandler);
  }
  const escHandler = (e) => { if (e.key === "Escape") closeEditor(); };
  document.addEventListener("keydown", escHandler);

  draw();
}

function openBacklog(b) {
  openSheet(`
    <h2 style="margin-bottom:6px">Log a past session</h2>
    <p class="muted">Forgot the timer? Happens to the best of us.</p>
    <label class="field" style="margin-top:12px"><span>Date</span><input id="bl-d" type="date" max="${todayStr()}" value="${todayStr()}"></label>
    <label class="field"><span>Minutes</span><input id="bl-m" type="number" min="1" placeholder="25"></label>
    <label class="field"><span>Page reached (optional)</span><input id="bl-p" type="number" min="0" placeholder="${b.currentPage || 0}"></label>
    <div class="btn-row"><button class="btn solid" id="bl-save">Log it</button></div>
  `, (sheet) => {
    $("#bl-save", sheet).addEventListener("click", () => {
      const mins = parseInt($("#bl-m", sheet).value, 10);
      const date = $("#bl-d", sheet).value;
      if (!mins || !date) { toast("A date and some minutes."); return; }
      const endPage = parseInt($("#bl-p", sheet).value, 10) || null;
      S.sessions.push({ id: uid(), bookId: b.id, date, minutes: mins, startPage: b.currentPage || 0, endPage, mood: null, createdAt: new Date(date + "T12:00").toISOString() });
      if (endPage && endPage > (b.currentPage || 0)) b.currentPage = endPage;
      grantXP(mins * XP_RULES.perMinute, "Backdated session");
      checkAchievements(); saveState(); closeSheet(); render();
      toast("Backdated and remembered.");
    });
  });
}

/* ================================================================
   BOOK DETAIL SHEET
================================================================ */
function openBookSheet(id) {
  const b = S.books.find((x) => x.id === id);
  if (!b) return;
  const st = bookStats(b.id);
  const pc = b.p ? Math.min(100, Math.round((b.currentPage || 0) / b.p * 100)) : 0;
  const notes = S.journal.filter((j) => j.bookId === b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const sims = similarBooks(b, 4);
  const eta = b.shelf === "reading" ? estimateFinish(b) : null;

  openSheet(`
    <div class="bd-hero">
      <div class="halo"></div>
      ${coverHTML(b, "cover xl")}
      <h2>${esc(b.t)}</h2><div class="a">${esc(b.a)}${b.y ? " · " + b.y : ""}</div>
      <div class="chips">
        <span class="chip gold">${SHELF_DEFS.find(([k]) => k === b.shelf)?.[1] || b.shelf}</span>
        ${b.r ? `<span class="chip">★ ${b.r} community</span>` : ""}
        ${b.p ? `<span class="chip">${b.p} pages</span>` : ""}
        ${(b.g || []).slice(0, 2).map((g) => `<span class="chip">${GENRES.find((x) => x.id === g)?.label || g}</span>`).join("")}
      </div>
    </div>
    ${b.b ? `<p class="muted" style="text-align:center;padding:4px 6px">${esc(b.b)}</p>` : ""}

    ${b.shelf === "reading" ? `
      <div class="card" style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span class="eyebrow" style="margin:0">Progress</span>
          <span class="muted small">${eta ? "done ~" + eta : ""}</span>
        </div>
        <div class="progress-line"><div class="fill" style="width:${pc}%"></div></div>
        <div class="muted small" style="margin-top:6px">Page ${b.currentPage || 0}${b.p ? " of " + b.p + ` · ${pc}%` : ""}</div>
      </div>` : ""}

    <div class="statgrid">
      <div class="cell"><div class="n">${fmtHM(st.minutes)}</div><div class="l">time inside</div></div>
      <div class="cell"><div class="n">${st.pages}</div><div class="l">pages logged</div></div>
      <div class="cell"><div class="n">${st.pace ? st.pace.toFixed(0) + "/h" : "—"}</div><div class="l">pace</div></div>
    </div>

    <div class="btn-row" style="justify-content:center">
      ${b.shelf === "reading" ? `<button class="btn solid" data-act="read">Start session</button>` : `<button class="btn solid" data-act="startbook">Start reading</button>`}
      ${b.shelf !== "finished" ? `<button class="btn ghost" data-act="finish">Mark finished</button>` : `<button class="btn ghost" data-act="card">Share card</button>`}
      <button class="btn ghost" data-act="fav">${icon("heart", { size: 14, filled: b.fav })} ${b.fav ? "Favorited" : "Favorite"}</button>
      <button class="btn ghost" data-act="note">${icon("feather", { size: 14 })} Journal this book</button>
      <button class="btn quiet" data-act="edit">Edit</button>
      ${b.shelf !== "dropped" && b.shelf !== "finished" ? `<button class="btn quiet" data-act="drop" style="color:var(--ember)">Drop it</button>` : ""}
    </div>

    ${b.shelf === "finished" ? `
      <hr class="dash">
      <div class="eyebrow">Your verdict</div>
      <div class="ratestars" id="rate">${[1,2,3,4,5].map((i) => `<span data-r="${i}" class="${i <= (b.rating||0) ? "on" : ""}">★</span>`).join("")}</div>
      <textarea id="rev" placeholder="How did you like the ending?" style="margin-top:10px">${esc(b.review || "")}</textarea>
      <div class="btn-row"><button class="btn sm" id="rev-save">Save review</button></div>` : ""}

    ${notes.length ? `<hr class="dash"><div class="eyebrow">Journal entries for this book</div>
      ${notes.slice(0, 4).map((n) => {
        const kd = JOURNAL_KINDS.find((k) => k.id === n.kind) || JOURNAL_KINDS[0];
        return `<div class="mini-entry">
          <div class="je-top"><span class="chip gold">${icon(kd.ic, { size: 11 })} ${kd.label}</span><span class="muted small">${fmtDateNice(n.createdAt)}</span></div>
          <p style="font-family:var(--font-d);font-size:15px;${n.kind === "quote" ? "font-style:italic" : ""}">${n.kind === "quote" ? "❝ " : ""}${esc(entryPreviewText(n, 140))}${n.kind === "quote" ? " ❞" : ""}</p>
          <div class="btn-row"><button class="btn quiet sm" data-mini-jedit="${n.id}">Edit</button></div>
        </div>`;
      }).join("")}
      <div class="btn-row"><button class="btn quiet sm" id="see-all-journal">See all in Journal</button></div>` : ""}

    ${st.sessions ? `<hr class="dash"><div class="eyebrow">Sessions</div>
      ${bookSessions(b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((s) => `
        <div class="session-item"><span>${fmtDateNice(s.date)}${s.mood ? " " + s.mood : ""}</span>
        <span class="muted">${fmtHM(s.minutes)}${s.endPage ? ` · to p.${s.endPage}` : ""}</span></div>`).join("")}
      <div class="btn-row"><button class="btn quiet sm" data-act="backlog">${icon("plus", { size: 13 })} Log a past session</button></div>`
      : `<div class="btn-row"><button class="btn quiet sm" data-act="backlog">${icon("plus", { size: 13 })} Log a past session</button></div>`}

    ${sims.length ? `<hr class="dash"><div class="eyebrow">You may also like</div>
      <div class="seg" style="margin:8px -20px 0;padding:4px 20px 8px">
        ${sims.map((c) => `<div data-sim="${c.id}" style="flex:0 0 92px;cursor:pointer">
          ${c.cover ? `<img class="cover" src="${c.cover}" alt="">` : genCoverHTML(c, "cover")}
          <div class="small" style="margin-top:5px;line-height:1.25">${esc(c.t)}</div>
        </div>`).join("")}
      </div>` : ""}
  `, (sheet) => {
    $$("[data-act]", sheet).forEach((btn) => btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      if (act === "read") { closeSheet(); startTimer(b.id); navigate("timer"); }
      if (act === "startbook") { moveShelf(b, "reading"); closeSheet(); openBookSheet(b.id); toast("On the nightstand."); }
      if (act === "finish") { closeSheet(); finishBookFlow(b); }
      if (act === "fav") { b.fav = !b.fav; if (b.fav) learnFrom(b, "love"); saveState(); openBookSheet(b.id); }
      if (act === "note") { closeSheet(); openJournalEditor({ bookId: b.id }); }
      if (act === "edit") { closeSheet(); openManualAdd(b); }
      if (act === "drop") { moveShelf(b, "dropped"); closeSheet(); render(); toast("Dropped. Life's too short — no guilt."); }
      if (act === "card") { closeSheet(); openShareCard({ kind: "book", book: b }); }
      if (act === "backlog") { closeSheet(); openBacklog(b); }
    }));
    $("#see-all-journal", sheet)?.addEventListener("click", () => { closeSheet(); journalFilter = "all"; journalBookQuery = b.t; navigate("journal"); });
    $$("[data-mini-jedit]", sheet).forEach((btn) => btn.addEventListener("click", () => {
      const n = S.journal.find((j) => j.id === btn.dataset.miniJedit);
      if (n) openJournalEditor({ entry: n });
    }));
    $$("#rate span", sheet).forEach((s) => s.addEventListener("click", () => {
      b.rating = +s.dataset.r; saveState();
      $$("#rate span", sheet).forEach((x) => x.classList.toggle("on", +x.dataset.r <= b.rating));
    }));
    $("#rev-save", sheet)?.addEventListener("click", () => {
      const had = !!b.review;
      b.review = $("#rev", sheet).value.trim();
      if (b.review && !had) grantXP(XP_RULES.review, "Wrote a review");
      checkAchievements(); saveState(); toast("Review kept.");
    });
    $$("[data-sim]", sheet).forEach((el) => el.addEventListener("click", () => {
      const cb = findCandidate(el.dataset.sim);
      if (!cb) return;
      closeSheet();
      openCatalogPreview(cb);
    }));
    sims.forEach((c) => {
      if (c.cover) return;
      resolveCatalogCover(c).then((url) => {
        if (!url) return;
        const el = $(`[data-sim="${c.id}"]`, sheet);
        if (!el) return;
        const img = el.querySelector(".cover");
        if (img) img.outerHTML = `<img class="cover" src="${url}" alt="">`;
      });
    });
    resolveCover(b);
  });
}

function openCatalogPreview(cb) {
  openSheet(`
    <div class="bd-hero"><div class="halo"></div>
      ${genCoverHTML(cb, "cover xl")}
      <h2>${esc(cb.t)}</h2><div class="a">${esc(cb.a)} · ${cb.y}</div>
      <div class="chips">
        <span class="chip gold">★ ${cb.r}</span><span class="chip">${cb.p} pages</span>
        ${cb.g.map((g) => `<span class="chip">${GENRES.find((x) => x.id === g)?.label}</span>`).join("")}
      </div>
    </div>
    <p class="muted" style="text-align:center;padding:6px">${esc(cb.b)}</p>
    <p class="fc-why-static">${esc(whyForYou(cb))}</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn solid" id="cp-start">Start reading</button>
      <button class="btn ghost" id="cp-save">${icon("plus", { size: 14 })} Wishlist</button>
    </div>
  `, (sheet) => {
    resolveCatalogCover(cb).then((url) => { if (url) $(".cover", sheet).outerHTML = `<img class="cover xl" src="${url}">`; });
    $("#cp-start", sheet).addEventListener("click", () => {
      const book = addBookFromCatalog(cb, "reading");
      checkAchievements(); saveState(); closeSheet(); openBookSheet(book.id);
    });
    $("#cp-save", sheet).addEventListener("click", () => {
      addBookFromCatalog(cb, "wishlist"); checkAchievements(); saveState(); closeSheet(); toast("Wishlisted.");
    });
  });
}

/* ================================================================
   TIMER
================================================================ */
let tickInt = null;
const getTimer = () => { try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch { return null; } };
const setTimer = (t) => t ? localStorage.setItem(TIMER_KEY, JSON.stringify(t)) : localStorage.removeItem(TIMER_KEY);
const elapsedMs = (t) => t ? t.acc + (t.paused ? 0 : Date.now() - t.last) : 0;

function startTimer(bookId) {
  const ex = getTimer();
  if (ex && ex.bookId !== bookId) { toast("Finish your open session first."); return; }
  if (!ex) {
    setTimer({ bookId, last: Date.now(), acc: 0, paused: false, mood: null, notified60: false });
    maybeAskNotificationPermission();
    updateCtaState();
  }
}

/* ---------------- notifications: permission, persistent session control,
   and the 60-minute "still reading?" check-in ----------------
   Honest limitation: this works while the browser/PWA process is still
   alive (foreground or lightly backgrounded). There's no server here to
   push to a fully-suspended, locked phone — that would need a real push
   backend, which this local-first app intentionally doesn't have. */
function notifSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}
function maybeAskNotificationPermission() {
  if (!notifSupported() || S.settings.notificationsAsked) return;
  S.settings.notificationsAsked = true; saveState();
  if (Notification.permission !== "default") return;
  openSheet(`
    <h2 style="text-align:center;margin-bottom:6px">Nudge you if you drift off?</h2>
    <p class="muted" style="text-align:center">Dogeared can check in after an hour of reading, and show a small control to pause or finish your session — even from your lock screen notifications.</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn solid" id="notif-yes">Allow notifications</button>
      <button class="btn ghost" id="notif-no">Not now</button>
    </div>
  `, (sheet) => {
    $("#notif-yes", sheet).addEventListener("click", () => {
      Notification.requestPermission().then((perm) => {
        closeSheet();
        toast(perm === "granted" ? "Notifications on." : "No worries — you can enable this later in your browser settings.");
        if (perm === "granted") updateSessionNotification();
      });
    });
    $("#notif-no", sheet).addEventListener("click", () => closeSheet());
  });
}
function canNotify() { return notifSupported() && Notification.permission === "granted"; }

async function updateSessionNotification(force = false) {
  if (!canNotify()) return;
  if (!force && document.visibilityState === "visible") return; // app is clearly open — no need to notify
  const t = getTimer();
  if (!t) return;
  const book = S.books.find((b) => b.id === t.bookId);
  if (!book) return;
  const mins = Math.round(elapsedMs(t) / 60000);
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("Dogeared session", {
      tag: "dogeared-session", renotify: false, silent: true, requireInteraction: true,
      icon: "icons/icon-192.png", badge: "icons/icon-192.png",
      body: `${book.t} · ${fmtHM(mins)} ${t.paused ? "· paused" : ""}`,
      actions: [
        { action: "pause", title: t.paused ? "Resume" : "Pause" },
        { action: "finish", title: "Finish" },
      ],
    });
  } catch {}
}
async function clearSessionNotifications() {
  if (!notifSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const list = await reg.getNotifications({ tag: "dogeared-session" });
    list.forEach((n) => n.close());
    const list2 = await reg.getNotifications({ tag: "dogeared-reminder" });
    list2.forEach((n) => n.close());
  } catch {}
}
async function notifyStillReading(book) {
  if (!canNotify()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("Still reading?", {
      tag: "dogeared-reminder", requireInteraction: true,
      icon: "icons/icon-192.png", badge: "icons/icon-192.png",
      body: `Your timer for "${book.t}" has been running for an hour.`,
      actions: [
        { action: "dismiss", title: "Still reading" },
        { action: "finish", title: "Finish session" },
      ],
    });
  } catch {}
}
function showStillReadingModal(book) {
  openSheet(`
    <h2 style="text-align:center;margin-bottom:6px">Still reading?</h2>
    <p class="muted" style="text-align:center">Your timer for "${esc(book.t)}" has been running for an hour.</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn ghost" id="sr-continue">Still reading</button>
      <button class="btn solid" id="sr-finish">Finish session</button>
    </div>
  `, (sheet) => {
    $("#sr-continue", sheet).addEventListener("click", () => closeSheet());
    $("#sr-finish", sheet).addEventListener("click", () => {
      closeSheet(); navigate("timer");
      const t = getTimer();
      if (t) { const b = S.books.find((x) => x.id === t.bookId); if (b) finishSessionFlow(b); }
    });
  });
}

/* global heartbeat — runs for as long as this tab/PWA stays open, checking
   the running timer every 60s to refresh the persistent notification and
   fire the one-hour check-in, regardless of which page is showing. */
let _heartbeat = null;
function startHeartbeat() {
  clearInterval(_heartbeat);
  _heartbeat = setInterval(() => {
    const t = getTimer();
    if (!t) return;
    updateSessionNotification();
    const mins = elapsedMs(t) / 60000;
    if (mins >= 60 && !t.notified60) {
      t.notified60 = true; setTimer(t);
      const book = S.books.find((b) => b.id === t.bookId);
      if (book) {
        if (document.visibilityState === "visible") showStillReadingModal(book);
        else notifyStillReading(book);
      }
    }
  }, 60000);
}

/* the app being minimized/backgrounded is the actual trigger for the
   persistent notification — not the moment the session starts. Coming
   back to the app clears it, since there's no need to nag someone who's
   already looking at the timer. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (getTimer()) updateSessionNotification(true);
  } else {
    clearSessionNotifications();
  }
});

/* handle taps on notification actions, whether the app was already open
   (message from the service worker) or just cold-launched (URL param) */
function handleNotificationAction(action) {
  const t = getTimer();
  if (!t) return;
  if (action === "pause") {
    if (t.paused) { t.paused = false; t.last = Date.now(); } else { t.acc += Date.now() - t.last; t.paused = true; }
    setTimer(t);
    updateSessionNotification();
    if (currentView === "timer") renderTimer();
  } else if (action === "finish") {
    navigate("timer");
    const book = S.books.find((b) => b.id === t.bookId);
    if (book) finishSessionFlow(book);
  }
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "notification-action") handleNotificationAction(e.data.action);
  });
}
{
  const notifParam = new URLSearchParams(location.search).get("notif");
  if (notifParam) {
    history.replaceState(null, "", location.pathname);
    window.addEventListener("load", () => setTimeout(() => handleNotificationAction(notifParam), 400));
  }
}

function renderTimer() {
  clearInterval(tickInt);
  const t = getTimer();
  const reading = S.books.filter((b) => b.shelf === "reading");

  if (!t) {
    root.innerHTML = `${topbar()}
      <div class="view">
        <h1 style="margin-bottom:16px">Session</h1>
        ${reading.length ? `<div class="card eared">
          <div class="eyebrow">Ready to return to your book?</div>
          ${reading.map((b) => `<div class="now-card" style="margin-top:14px">
            ${coverHTML(b)}
            <div class="meta"><div class="t">${esc(b.t)}</div><div class="a">${esc(b.a)}</div>
              <div class="muted small" style="margin-top:4px">Page ${b.currentPage || 0}${b.p ? " of " + b.p : ""}</div></div>
            <button class="btn sm solid" data-begin="${b.id}" style="align-self:center">Begin</button>
          </div>`).join("")}
        </div>` : `<div class="card empty">
          ${logoChip(16, 70)}
          <div class="serif">Your bookmark is getting lonely.</div>
          <p>Start a book from Discover or Library and the clock is yours.</p>
          <button class="btn solid" data-go-discover style="margin-top:10px">Find a book</button>
        </div>`}
        <p class="muted small" style="text-align:center">Sessions work like workouts — track time, pages, and mood. Five minutes keeps your streak alive.</p>
      </div>`;
    wireTopbar(root);
    $$("[data-begin]", root).forEach((b) => b.addEventListener("click", () => { startTimer(b.dataset.begin); renderTimer(); }));
    $("[data-go-discover]", root)?.addEventListener("click", () => navigate("discover"));
    return;
  }

  const book = S.books.find((b) => b.id === t.bookId);
  if (!book) { setTimer(null); renderTimer(); return; }

  root.innerHTML = `${topbar()}
    <div class="view timer-page ${t.paused ? "paused" : ""}">
      <div class="card eared timer-hero">
        <div class="breath">${logoChip(0, 90)}</div>
        <div class="time" id="tt">0:00</div>
        <div class="bl">${esc(book.t)} · from page ${book.currentPage || 0}</div>
        <div class="eyebrow" style="margin-top:18px">How's it feel?</div>
        <div class="mood-row">
          ${SESSION_MOODS.map(([em, l]) => `<button data-mood="${em}" title="${l}" class="${t.mood === em ? "on" : ""}">${em}</button>`).join("")}
        </div>
        <div class="btn-row" style="justify-content:center;margin-top:22px">
          <button class="btn ghost" id="tp">${t.paused ? "Resume" : "Pause"}</button>
          <button class="btn solid" id="tf">Finish session</button>
        </div>
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn quiet sm" id="tq">${icon("bookmark", { size: 13 })} Save a quote mid-read</button>
      </div>
      <p class="muted small" style="text-align:center">Timer keeps counting even if your screen locks. Go get lost.</p>
    </div>`;
  wireTopbar(root);

  const tt = $("#tt");
  const tick = () => {
    const c = getTimer(); if (!c) return;
    const s = Math.floor(elapsedMs(c) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    tt.textContent = h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
  };
  tick(); tickInt = setInterval(tick, 1000);

  $$("[data-mood]", root).forEach((b) => b.addEventListener("click", () => {
    const c = getTimer(); c.mood = c.mood === b.dataset.mood ? null : b.dataset.mood; setTimer(c);
    $$("[data-mood]", root).forEach((x) => x.classList.toggle("on", x.dataset.mood === c.mood));
  }));
  $("#tp").addEventListener("click", () => {
    const c = getTimer();
    if (c.paused) { c.paused = false; c.last = Date.now(); } else { c.acc += Date.now() - c.last; c.paused = true; }
    setTimer(c); renderTimer();
    updateSessionNotification();
  });
  $("#tq").addEventListener("click", () => openJournalEditor({ bookId: book.id, presetKind: "quote" }));
  $("#tf").addEventListener("click", () => finishSessionFlow(book));
}

function finishSessionFlow(book) {
  const t = getTimer(); if (!t) return;
  const minutes = Math.max(1, Math.round(elapsedMs(t) / 60000));
  const startPage = book.currentPage || 0;
  const maxPage = book.p || Math.max(startPage + 200, 300);

  openSheet(`
    <h2 style="margin-bottom:4px">Closing the book for now</h2>
    <p class="muted">${fmtHM(minutes)} with <em>${esc(book.t)}</em>.</p>
    <label class="field" style="margin-top:16px"><span>Where did you land? — <strong id="pl">page ${startPage}</strong></span>
      <input type="range" id="ps" min="${startPage}" max="${maxPage}" value="${startPage}"></label>
    <label class="field"><span>Or type it</span><input type="number" id="pn" min="${startPage}" max="${maxPage}" value="${startPage}"></label>
    <div class="btn-row">
      <button class="btn solid" id="fs-save">Save session</button>
      <button class="btn quiet" id="fs-x" style="color:var(--ember)">Discard</button>
    </div>
  `, (sheet) => {
    const ps = $("#ps", sheet), pn = $("#pn", sheet), pl = $("#pl", sheet);
    const sync = (v) => { v = Math.min(maxPage, Math.max(startPage, +v || startPage)); ps.value = v; pn.value = v; pl.textContent = "page " + v; };
    ps.addEventListener("input", () => sync(ps.value));
    pn.addEventListener("input", () => sync(pn.value));

    $("#fs-save", sheet).addEventListener("click", () => {
      const endPage = +ps.value;
      const pagesRead = Math.max(0, endPage - startPage);
      const firstToday = !S.sessions.some((s) => s.date === todayStr());
      const prevStreak = computeStreak();

      S.sessions.push({
        id: uid(), bookId: book.id, date: todayStr(), minutes,
        startPage, endPage, mood: t.mood, createdAt: new Date().toISOString(),
      });
      if (endPage > (book.currentPage || 0)) book.currentPage = endPage;
      setTimer(null);
      clearSessionNotifications();
      updateCtaState();

      let xp = minutes * XP_RULES.perMinute + pagesRead * XP_RULES.perPage;
      if (firstToday) xp += XP_RULES.firstSessionOfDay;
      grantXP(xp, `Session: ${book.t}`);

      const finished = book.p && endPage >= book.p;
      if (finished) moveShelf(book, "finished");

      const fresh = checkAchievements();
      saveState(); closeSheet();
      showSummary({ book, minutes, pagesRead, xp, finished, fresh, prevStreak });
    });
    $("#fs-x", sheet).addEventListener("click", () => {
      if (confirm("Let this session go unrecorded?")) { setTimer(null); clearSessionNotifications(); updateCtaState(); closeSheet(); render(); }
    });
  });
}

function showSummary({ book, minutes, pagesRead, xp, finished, fresh, prevStreak }) {
  const g = globalStats();
  const streakUp = g.streak > prevStreak;
  const st = bookStats(book.id);
  const pace = minutes ? Math.round(pagesRead / (minutes / 60)) : 0;
  const pc = book.p ? Math.min(100, Math.round((book.currentPage || 0) / book.p * 100)) : null;

  const el = document.createElement("div");
  el.className = "summary";
  el.innerHTML = `
    <div class="aurora"></div>
    <div class="sum-inner">
      <div class="eyebrow">${finished ? "Book finished" : "Session complete"}</div>
      <div class="big">${pagesRead || minutes}</div>
      <div class="biglabel">${pagesRead ? "pages read" : "minutes read"}</div>
      <div class="sumgrid">
        <div class="cell"><div class="n">${fmtHM(minutes)}</div><div class="l">duration</div></div>
        <div class="cell"><div class="n">${pace ? pace + "/h" : "—"}</div><div class="l">pace</div></div>
        <div class="cell"><div class="n">${icon("flame", { size: 18 })} ${g.streak}</div><div class="l">${streakUp ? "streak extended" : "day streak"}</div></div>
        <div class="cell"><div class="n">${finished ? "100%" : pc !== null ? pc + "%" : st.sessions}</div><div class="l">${finished || pc !== null ? "complete" : "sessions"}</div></div>
      </div>
      <div><span class="xp-pop">${icon("sparkle", { size: 16 })} +${Math.round(xp)} XP</span></div>
      ${fresh.map((a) => `<div class="ach-pop"><span class="chip gold" style="font-size:13px;padding:8px 16px">${icon(a.ic, { size: 15 })} Achievement — ${a.t}</span></div>`).join("")}
      ${finished ? `<p class="muted" style="margin-top:18px">"${esc(book.t)}" joins your finished shelf. Rate it while it's still humming.</p>` : ""}
      <div class="btn-row" style="justify-content:center;margin-top:26px">
        <button class="btn solid" id="sum-share">Share this</button>
        ${finished ? `<button class="btn ghost" id="sum-rate">Rate the book</button>` : ""}
        <button class="btn ghost" id="sum-done">Done</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  $("#sum-done", el).addEventListener("click", () => { el.remove(); navigate("home"); });
  $("#sum-rate", el)?.addEventListener("click", () => { el.remove(); navigate("library"); openBookSheet(book.id); });
  $("#sum-share", el).addEventListener("click", () => {
    el.remove();
    openShareCard(finished
      ? { kind: "book", book }
      : { kind: "session", book, session: { minutes, pagesRead, pace } });
    navigate("home");
  });
}

function finishBookFlow(b) {
  moveShelf(b, "finished");
  const fresh = checkAchievements();
  saveState();
  showSummary({ book: b, minutes: 0, pagesRead: 0, xp: XP_RULES.finishBook, finished: true, fresh, prevStreak: computeStreak() });
}

/* ================================================================
   SHARE CARDS — 9:16, solid color, optional transparent (no cover)
================================================================ */
/* ================================================================
   SHARE CARDS — 9:16, gradient (non-transparent), always anchored to
   a book cover. History is recorded so a card can be re-shared later.
================================================================ */
const fmtDateForCard = (d = new Date()) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/* Deterministic filenames — saving twice reuses the same name instead of
   piling up "image (1).png", "image (2).png", etc. */
const WRAP_SLIDE_SLUGS = {
  stats: "the-months-in-numbers",
  topgenre: "top-genre",
  collage: "books-you-lived-in",
  quote: "standout-line",
  compare: "compared-to-last-month",
  recap: "well-read",
};
function monthlyWrapFilename(ms, variant) {
  const monthSlug = ms.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slideSlug = WRAP_SLIDE_SLUGS[variant] || "recap";
  return `dogeared-monthly-wrapped-${monthSlug}-${slideSlug}.jpg`;
}
function timestampSlug() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}-${hh}${mi}${ss}`;
}
function statsFilename(kind, ext) {
  const label = { book: "book", session: "session", weekstats: "my-week", wrap: "my-reading-life", history: "reshare" }[kind] || "stats";
  return `dogeared-stats-${label}-${timestampSlug()}.${ext}`;
}

function resolveCardData(cfg) {
  const g = globalStats();
  if (cfg.kind === "history") return cfg.data;

  if (cfg.kind === "book") {
    const st = bookStats(cfg.book.id);
    return {
      kicker: "finished & dog-eared", dateStr: fmtDateForCard(),
      title: cfg.book.t, subtitle: cfg.book.a, coverUrl: cfg.book.cover, book: cfg.book,
      stars: cfg.book.rating || null,
      stats: [
        [cfg.book.p || st.pages || "—", "pages"],
        [fmtHM(st.minutes), "time inside"],
        [st.days || 1, "reading days"],
        [g.streak, "day streak"],
      ],
    };
  }
  if (cfg.kind === "session") {
    return {
      kicker: "reading session", dateStr: fmtDateForCard(),
      title: cfg.book.t, subtitle: cfg.book.a, coverUrl: cfg.book.cover, book: cfg.book,
      stats: [
        [cfg.session.pagesRead, "pages"],
        [fmtHM(cfg.session.minutes), "duration"],
        [cfg.session.pace ? cfg.session.pace + "/h" : "—", "pace"],
        [g.streak, "day streak"],
      ],
    };
  }
  if (cfg.kind === "monthwrap") {
    const ms = cfg.ms, anchor = ms.topBook || null;
    const hours = Math.round(ms.minutes / 60);
    const variant = cfg.variant || "stats";

    if (variant === "quote" && ms.quote) {
      const qb = ms.quote.bookId ? S.books.find((b) => b.id === ms.quote.bookId) : null;
      return {
        kicker: "STANDOUT LINE", dateStr: fmtDateForCard(),
        title: `"${ms.quote.text}"`, subtitle: qb ? qb.t : "freeform",
        coverUrl: qb?.cover || null, book: qb || null,
        stats: [[ms.label, "this month"], [ms.finished.length, "books finished"]],
      };
    }
    if (variant === "compare") {
      const prevMs = cfg.prevMs;
      const pageDelta = ms.pages - prevMs.pages;
      const hrsDelta = hours - Math.round(prevMs.minutes / 60);
      return {
        kicker: "MONTH OVER MONTH", dateStr: fmtDateForCard(),
        title: `${pageDelta >= 0 ? "+" : ""}${pageDelta} pages vs last month`,
        subtitle: ms.label, coverUrl: anchor?.cover || null, book: anchor,
        stats: [
          [ms.pages, "pages this month"], [prevMs.pages, "pages last month"],
          [`${hrsDelta >= 0 ? "+" : ""}${hrsDelta}h`, "time change"], [hours + "h", "time this month"],
        ],
      };
    }
    if (variant === "collage") {
      return {
        kicker: "BOOKS THIS MONTH", dateStr: fmtDateForCard(),
        title: `${ms.finished.length} book${ms.finished.length === 1 ? "" : "s"} lived in`,
        subtitle: ms.label, coverUrl: anchor?.cover || null, book: anchor,
        stats: [[ms.pages, "pages read"], [hours + "h", "time reading"], [ms.bestStreak, "best streak"], [ms.booksTouched.length, "books touched"]],
      };
    }
    if (variant === "recap") {
      return cfg.quiet ? {
        kicker: "A QUIET MONTH", dateStr: fmtDateForCard(),
        title: "And that's alright.", subtitle: ms.label, coverUrl: null, book: null,
        stats: [[ms.pages, "pages read"], [hours + "h", "time reading"]],
      } : {
        kicker: "WELL READ", dateStr: fmtDateForCard(),
        title: anchor ? `"${anchor.t}" stayed with you` : "A steady month of pages",
        subtitle: ms.topGenres.length ? "Mostly " + ms.topGenres.map((g) => GENRES.find((x) => x.id === g)?.label).join(" & ") : ms.label,
        coverUrl: anchor?.cover || null, book: anchor,
        stats: [[ms.pages, "pages read"], [hours + "h", "time reading"], [ms.bestStreak, "best streak"], [ms.finished.length, "books finished"]],
      };
    }
    // "intro" and "stats" (default) — the full month-in-numbers card
    return {
      kicker: ms.label, dateStr: fmtDateForCard(),
      title: anchor ? anchor.t : `${ms.finished.length} book${ms.finished.length === 1 ? "" : "s"} this month`,
      subtitle: anchor ? anchor.a : "", coverUrl: anchor?.cover || null, book: anchor,
      stats: [
        [ms.pages, "pages read"],
        [fmtHM(ms.minutes), "time reading"],
        [ms.bestStreak, "best streak"],
        [ms.topGenres[0] ? GENRES.find((x) => x.id === ms.topGenres[0])?.label : "—", "top genre"],
      ],
    };
  }
  if (cfg.kind === "weekstats") {
    const streak = computeStreak();
    return {
      kicker: "WEEKLY REPORT", dateStr: weekRangeLabel(),
      title: `${pagesThisWeek()} pages this week`,
      subtitle: sessionsThisWeek() ? `across ${sessionsThisWeek()} session${sessionsThisWeek() === 1 ? "" : "s"}` : "a quieter week — that's alright",
      coverUrl: null, book: null, shelfBooks: booksForShelf(12),
      badges: ACHIEVEMENTS.filter((a) => S.unlocked[a.id]).map((a) => a.ic),
      stats: [
        [pagesThisWeek(), "pages this week"],
        [fmtHM(minutesThisWeek()), "time this week"],
        [streak, "day streak"],
        [booksFinishedThisWeek(), "books finished"],
      ],
    };
  }
  // "wrap" — lifetime "My Reading Life" card, anchored to a representative book
  const anchor = pickAnchorBook();
  return {
    kicker: "MY READING LIFE", dateStr: fmtDateForCard(),
    title: anchor ? anchor.t : "A reading life, just beginning",
    subtitle: anchor ? anchor.a : "", coverUrl: anchor?.cover || null, book: anchor,
    stats: [
      [g.totalPages, "pages read"],
      [fmtHM(g.totalMin), "total time"],
      [g.bestStreak, "best streak"],
      ["Lv " + levelForXP(S.xp), "reader level"],
    ],
  };
}

function openShareCard(cfg) {
  // the cover-derived gradient is a deliberate exception to the app's
  // black/white/gray UI — it only ever appears on share cards anchored to
  // a specific book (finishing a book, a reading session), where a gradient
  // pulled from that exact cover makes the card feel personalized. Weekly
  // stats, the monthly wrap, and the lifetime card stay grayscale, since
  // they aren't about one cover.
  const bookAnchored = cfg.kind === "book" || cfg.kind === "session"
    || (cfg.kind === "history" && ["book", "session"].includes(cfg.data?.kind));
  let styleDefs = bookAnchored
    ? [["theme", "Cover gradient"], ["gradient", "Classic"], ["transparent", "Transparent"]]
    : [["gradient", "Classic"], ["transparent", "Transparent"]];
  if (cfg.kind === "monthwrap") styleDefs = styleDefs.filter(([id]) => id !== "transparent");
  let style = styleDefs[0][0];
  const cardData = resolveCardData(cfg);
  if (cfg.kind !== "history") recordShareHistory({ kind: cfg.kind, ...cardData });

  const build = (canvas) => {
    drawShareCard(canvas, {
      style,
      kicker: cardData.kicker, dateStr: cardData.dateStr,
      title: cardData.title, subtitle: cardData.subtitle,
      coverUrl: cardData.coverUrl, book: cardData.book, stars: cardData.stars,
      shelfBooks: cardData.shelfBooks, stats: cardData.stats, badges: cardData.badges, profileName: S.profile.name,
    });
  };
  const filenameFor = () => statsFilename(cfg.kind === "history" ? (cfg.data?.kind || "history") : cfg.kind, "png");

  openSheet(`
    <h2 style="text-align:center;margin-bottom:4px">Share it beautifully</h2>
    <p class="muted" style="text-align:center">Made for Stories, Threads, and group chats.</p>
    <div class="share-wrap ${style === "transparent" ? "preview-dark" : ""}" id="share-wrap-el" style="margin-top:12px"><canvas id="sc"></canvas></div>
    <div class="opt-row" id="style-row">
      ${styleDefs.map(([id, label], i) => `<button data-style="${id}" class="${i === 0 ? "active" : ""}">${label}</button>`).join("")}
    </div>
    <div class="btn-row" style="justify-content:center">
      <button class="btn solid" id="sc-share">Share</button>
      <button class="btn ghost" id="sc-dl">Save image</button>
    </div>
  `, (sheet) => {
    const canvas = $("#sc", sheet);
    build(canvas);
    $$("[data-style]", sheet).forEach((b) => b.addEventListener("click", () => {
      style = b.dataset.style;
      $$("[data-style]", sheet).forEach((x) => x.classList.toggle("active", x === b));
      $("#share-wrap-el", sheet).classList.toggle("preview-dark", style === "transparent");
      build(canvas);
    }));
    $("#sc-dl", sheet).addEventListener("click", () => {
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filenameFor();
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }, "image/png");
    });
    $("#sc-share", sheet).addEventListener("click", () => {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "dogeared.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: "Dogeared" }); } catch {}
        } else { toast("Native share unavailable — saving instead."); $("#sc-dl", sheet).click(); }
      }, "image/png");
    });
  });
}

/* Captures the whole "Monthly Wrapped" region — header, slide content, and
   the small bottom brand line — but not the progress bar, close button, or
   prev/next controls — then composites it into a fixed 1080×1920 (9:16)
   frame, cover-fit, so it fills an Instagram Story regardless of the
   device's actual screen proportions. Each slide gets its own descriptive
   filename, so re-saving the same slide doesn't create endless copies. */
async function saveWrapSlideAsImage(viewerEl, ms, variant, btn) {
  const target = $("#wrap-capture", viewerEl);
  if (!target || typeof html2canvas === "undefined") { toast("Couldn't save the image — try again."); return; }
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Saving…";
  try {
    const bg = getComputedStyle(viewerEl).backgroundColor || "#141414";
    const captured = await html2canvas(target, {
      backgroundColor: bg,
      scale: Math.min(3, window.devicePixelRatio || 2),
      useCORS: true,
      logging: false,
    });
    const OUT_W = 1080, OUT_H = 1920;
    const out = document.createElement("canvas");
    out.width = OUT_W; out.height = OUT_H;
    const octx = out.getContext("2d");
    octx.fillStyle = bg; octx.fillRect(0, 0, OUT_W, OUT_H);
    // contain-fit: never crops (a taller phone screen used to get its header/logo
    // cut off under cover-fit); any leftover edge is just filled with the same
    // solid background, which reads as intentional padding, not a bug.
    const scale = Math.min(OUT_W / captured.width, OUT_H / captured.height);
    const sw = captured.width * scale, sh = captured.height * scale;
    octx.drawImage(captured, (OUT_W - sw) / 2, (OUT_H - sh) / 2, sw, sh);

    out.toBlob((blob) => {
      if (!blob) { toast("Couldn't save the image — try again."); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = monthlyWrapFilename(ms, variant);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast("Saved.");
    }, "image/jpeg", 0.92);
  } catch {
    toast("Couldn't save the image — try again.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

/* ================================================================
   MONTHLY WRAP — Spotify-Wrapped-style swipeable recap
================================================================ */
function closingStatement(ms, quiet) {
  if (quiet) {
    return "Every reading life has months like this one. The shelf isn't going anywhere — pick it back up whenever you're ready.";
  }
  const hours = Math.round(ms.minutes / 60);
  const bookPhrase = ms.finished.length ? `${ms.finished.length} book${ms.finished.length === 1 ? "" : "s"}` : "a few chapters here and there";
  return `${bookPhrase}, ${ms.pages} pages, ${hours} hour${hours === 1 ? "" : "s"} spent somewhere else entirely. However the month went, you showed up for the pages.`;
}

function openMonthlyWrap(ym) {
  const ms = computeMonthStats(ym);
  const prevMs = computeMonthStats(prevMonthKey(ym));
  const quiet = ms.minutes < 30;
  let idx = 0;
  let newGoal = S.profile.dailyGoal;

  const slides = buildWrapSlides();
  function buildWrapSlides() {
    const s = [];
    s.push(`<div class="wrap-slide">
      <div class="wrap-ic">${icon("calendar", { size: 34 })}</div>
      <div class="eyebrow">Your reading wrap</div>
      <h1 class="serif">${ms.label}</h1>
      <p class="muted" style="max-width:32ch;margin:10px auto 0">A quiet look back at the month, one page at a time.</p>
    </div>`);

    s.push(`<div class="wrap-slide">
      <div class="eyebrow">The month in numbers</div>
      <div class="wrap-grid">
        <div class="cell"><div class="n">${ms.finished.length}</div><div class="l">books finished</div></div>
        <div class="cell"><div class="n">${ms.pages}</div><div class="l">pages read</div></div>
        <div class="cell"><div class="n">${Math.round(ms.minutes / 60)}h</div><div class="l">time reading</div></div>
        <div class="cell"><div class="n">${ms.bestStreak}</div><div class="l">best streak</div></div>
      </div>
    </div>`);

    const topGenreId = ms.topGenres[0];
    const topGenreDef = topGenreId ? GENRES.find((g) => g.id === topGenreId) : null;
    const topGenreCount = topGenreId ? ms.finished.filter((b) => (b.g || []).includes(topGenreId)).length : 0;
    s.push(`<div class="wrap-slide">
      <div class="eyebrow">Top genre</div>
      ${topGenreDef ? `
        <div class="wrap-ic">${icon(topGenreDef.ic || "book", { size: 34 })}</div>
        <h1 class="serif" style="margin-top:10px">${esc(topGenreDef.label)}</h1>
        <p class="muted" style="max-width:32ch;margin:10px auto 0">${topGenreCount} of ${ms.finished.length} book${ms.finished.length === 1 ? "" : "s"} finished this month ${topGenreCount === ms.finished.length && ms.finished.length > 1 ? "— you were all in" : "leaned " + topGenreDef.label.toLowerCase()}.</p>
      ` : `<p class="muted" style="margin-top:16px">Finish a book this month and we'll spot the pattern.</p>`}
    </div>`);

    s.push(`<div class="wrap-slide">
      <div class="eyebrow">Books you lived in</div>
      ${ms.booksTouched.length ? `<div class="collage">${ms.booksTouched.slice(0, 9).map((b) => coverHTML(b, "cover")).join("")}</div>`
        : `<p class="muted" style="margin-top:16px">No sessions logged yet this month — next month's collage starts with one page.</p>`}
    </div>`);

    s.push(`<div class="wrap-slide">
      <div class="eyebrow">Standout line</div>
      ${ms.quote ? `<div class="wrap-quote">"${esc(ms.quote.text)}"</div>
        <div class="muted small" style="margin-top:10px">${ms.quote.bookId ? "— " + esc(S.books.find((b) => b.id === ms.quote.bookId)?.t || "") : "— freeform"}</div>`
        : `<p class="muted" style="margin-top:16px">No quotes saved this month. Press a line into your Journal next time one stops you.</p>`}
    </div>`);

    const pageDelta = ms.pages - prevMs.pages;
    const hrsDelta = Math.round(ms.minutes / 60) - Math.round(prevMs.minutes / 60);
    const pctChange = prevMs.pages > 0 ? Math.round((pageDelta / prevMs.pages) * 100) : null;
    const compareTagline = prevMs.pages === 0 && ms.pages > 0
      ? "From a blank page to this — not bad."
      : pctChange === null ? "A new month, a new stack."
      : pctChange > 15 ? `Up ${pctChange}% from last month. Momentum.`
      : pctChange < -15 ? "A slower month than last — pages aren't a race."
      : "Steady as ever.";
    s.push(`<div class="wrap-slide">
      <div class="eyebrow">Compared to last month</div>
      <p class="muted small" style="margin:-4px 0 4px">${compareTagline}</p>
      <div class="compare-row">
        <div class="compare-cell">
          <div class="n">${ms.pages}<span class="delta ${pageDelta >= 0 ? "up" : "down"}">${pageDelta >= 0 ? "+" : ""}${pageDelta}</span></div>
          <div class="l">pages (was ${prevMs.pages})</div>
        </div>
        <div class="compare-cell">
          <div class="n">${Math.round(ms.minutes / 60)}h<span class="delta ${hrsDelta >= 0 ? "up" : "down"}">${hrsDelta >= 0 ? "+" : ""}${hrsDelta}h</span></div>
          <div class="l">time (was ${Math.round(prevMs.minutes / 60)}h)</div>
        </div>
      </div>
    </div>`);

    s.push(quiet ? `<div class="wrap-slide">
      <div class="wrap-ic">${icon("feather", { size: 30 })}</div>
      <div class="eyebrow">A quiet month</div>
      <h2 class="serif" style="margin-top:6px">And that's alright.</h2>
      <p class="muted" style="max-width:34ch;margin:10px auto 0">Life happens between pages too. Your shelf isn't going anywhere, and neither is your streak's memory of the days before this one.</p>
    </div>` : `<div class="wrap-slide">
      <div class="wrap-ic">${icon("award", { size: 30 })}</div>
      <div class="eyebrow">Well read</div>
      <h2 class="serif" style="margin-top:6px">${ms.topBook ? `"${esc(ms.topBook.t)}" stayed with you.` : "A steady month of pages."}</h2>
      <p class="muted" style="max-width:34ch;margin:10px auto 0">${ms.topGenres.length ? "Mostly " + ms.topGenres.map((g) => GENRES.find((x) => x.id === g)?.label.toLowerCase()).join(" & ") + " this time." : "A wide-ranging month of reading."}</p>
    </div>`);

    s.push(`<div class="wrap-slide">
      <div class="eyebrow">Looking ahead</div>
      <h2 class="serif">A page goal for next month?</h2>
      <div class="goal-dial" style="margin-top:10px"><div class="n" id="wg-n">${newGoal}</div><div class="u">pages a day</div></div>
      <input type="range" id="wg-range" min="5" max="100" step="5" value="${newGoal}" style="max-width:280px;margin:8px auto">
      <p class="muted small" style="margin-top:10px">Adjusts your daily goal in Your taste as you slide it.</p>
      <button class="btn solid" id="wg-save" style="margin-top:16px">Continue</button>
    </div>`);

    s.push(`<div class="wrap-slide">
      <div class="wrap-ic">${icon("sparkle", { size: 30 })}</div>
      <div class="eyebrow">${ms.label}</div>
      <h2 class="serif" style="margin-top:6px">Well done this month.</h2>
      <p class="muted" style="max-width:34ch;margin:10px auto 0">${closingStatement(ms, quiet)}</p>
    </div>`);
    return s;
  }

  const slideVariants = [null, "stats", "topgenre", "collage", "quote", "compare", "recap", null, null];
  const GOAL_IDX = slides.length - 2; // "Looking ahead" is always second-to-last

  const el = document.createElement("div");
  el.className = "wrap-viewer";
  document.body.appendChild(el);

  const draw = () => {
    const variant = slideVariants[idx];
    const isLast = idx === slides.length - 1;
    const navLocked = idx === GOAL_IDX; // let the goal slider be dragged without triggering slide changes
    el.innerHTML = `
      <div class="wrap-progress">${slides.map((_, i) => `<i class="${i < idx ? "done" : i === idx ? "now" : ""}"></i>`).join("")}</div>
      <button class="close-x wrap-close">${icon("x", { size: 16 })}</button>
      <div class="wrap-capture" id="wrap-capture">
        <div class="wrap-header">
          <div class="wrap-header-kicker">Monthly Wrapped</div>
          <div class="wrap-header-month">${esc(ms.label)}</div>
        </div>
        <div class="wrap-body">${slides[idx]}</div>
        <div class="wrap-brand"><img src="icons/logo.png" alt="" style="width:18px;height:18px;object-fit:contain"><span>Dogeared</span></div>
      </div>
      ${navLocked ? "" : `<div class="wrap-nav">
        <button class="tap-zone left" aria-label="Previous"></button>
        <button class="tap-zone right" aria-label="Next"></button>
      </div>`}
      <div class="wrap-foot">
        ${isLast ? "<span></span>" : variant ? `<button class="btn ghost sm" id="wr-save">${icon("download", { size: 14 })} Save</button>` : "<span></span>"}
        <div class="btn-row" style="margin:0">
          ${idx > 0 ? `<button class="iconbtn" id="wr-prev">${icon("chev_l", { size: 18 })}</button>` : ""}
          ${isLast ? `<button class="btn solid" id="wr-done">Done</button>` : idx < slides.length - 1 ? `<button class="iconbtn" id="wr-next">${icon("chev_r", { size: 18 })}</button>` : ""}
        </div>
      </div>`;

    $(".wrap-close", el).addEventListener("click", () => finish());
    $(".tap-zone.left", el)?.addEventListener("click", () => go(-1));
    $(".tap-zone.right", el)?.addEventListener("click", () => go(1));
    $("#wr-prev", el)?.addEventListener("click", () => go(-1));
    $("#wr-next", el)?.addEventListener("click", () => go(1));
    $("#wr-done", el)?.addEventListener("click", () => finish());
    $("#wr-save", el)?.addEventListener("click", (e) => saveWrapSlideAsImage(el, ms, variant, e.currentTarget));
    $("#wg-range", el)?.addEventListener("input", (e) => {
      newGoal = +e.target.value;
      $("#wg-n", el).textContent = newGoal;
      S.profile.dailyGoal = newGoal; // live — reflected in Your taste immediately as the user drags
      saveState();
    });
    $("#wg-save", el)?.addEventListener("click", () => {
      toast(`Daily goal set to ${newGoal} pages — updated in Your taste too.`);
      go(1);
    });
  };
  const go = (d) => { idx = Math.max(0, Math.min(slides.length - 1, idx + d)); draw(); };
  const finish = () => { markWrapViewed(ym); el.remove(); render(); };

  // swipe support (disabled on the goal slide, same reason as the tap zones)
  let sx = null;
  el.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (sx === null || idx === GOAL_IDX) { sx = null; return; }
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    sx = null;
  }, { passive: true });

  markWrapViewed(ym); // mark as seen once opened (banner won't nag again)
  draw();
}

/* ================================================================
   PROFILE — theme toggle lives here only
================================================================ */
const GOOGLE_G_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03z"/>
  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
</svg>`;

function accountSectionHTML() {
  if (!CLOUD_ENABLED) {
    return `<p class="muted small">Cloud sync isn't set up for this copy of the app yet — your data stays right here on this device either way.</p>`;
  }
  if (cloudUser) {
    const label = cloudStatusLabel();
    const hasError = cloudStatus === "error";
    return `
      <div class="account-row">
        ${cloudUser.photoURL ? `<img class="account-avatar" src="${cloudUser.photoURL}" referrerpolicy="no-referrer" alt="">` : `<div class="account-avatar account-avatar-fallback">${icon("book", { size: 18 })}</div>`}
        <div style="flex:1;min-width:0">
          <div class="account-name">${esc(cloudUser.displayName || cloudUser.email || "Signed in")}</div>
          <div class="muted small account-status" style="${hasError ? "color:var(--ember)" : ""}">${esc(label || "")}</div>
        </div>
      </div>
      <div class="btn-row">
        ${hasError ? `<button class="btn ghost sm" id="acct-retry">${icon("refresh", { size: 13 })} Retry sync</button>` : ""}
        <button class="btn ghost sm" id="acct-signout">Sign out</button>
      </div>
      <p class="muted small" style="margin-top:6px">Signing out only signs out — your reading data stays on this device too.</p>`;
  }
  return `
    <p class="muted small" style="margin-bottom:10px">Sign in to back up your shelf and pick up where you left off on another device.</p>
    <button class="btn ghost block" id="acct-google">${GOOGLE_G_SVG} Sign in with Google</button>`;
}

function renderProfile() {
  const g = globalStats();
  const lv = levelForXP(S.xp);
  const cur = xpForLevel(lv), next = xpForLevel(lv + 1);
  const lvPct = Math.min(100, Math.round((S.xp - cur) / (next - cur) * 100));
  const unlockedN = Object.keys(S.unlocked).length;
  const readerProfileText = ensureReaderProfileFresh();

  root.innerHTML = `${topbar()}
    <div class="view">
      <div class="profile-head rise">
        <button class="avatar-btn" id="pf-avatar-btn" aria-label="Change avatar">${avatarHTML(60)}</button>
        <h1 id="pf-name-btn" style="cursor:pointer">${esc(S.profile.name)} ${icon("pen", { size: 14, cls: "pf-name-edit-ic" })}</h1>
      </div>

      <div class="card eared level-card rise">
        <div class="level-badge"><div class="n">${lv}</div><div class="l">LEVEL</div></div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <strong style="font-weight:400">${S.xp.toLocaleString()} XP</strong>
            <span class="muted small">${next - S.xp} to level ${lv + 1}</span>
          </div>
          <div class="xpbar"><i style="width:${lvPct}%"></i></div>
          <p class="muted small" style="margin-top:7px">XP grows with minutes, pages, finished books, journal entries, and streaks.</p>
        </div>
      </div>

      <div class="card eared reader-profile-card rise d1">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="eyebrow" style="margin:0">${icon("sparkle", { size: 12 })} Your reading profile</span>
          <button class="iconbtn" id="pf-refresh-profile" title="Refresh">${icon("refresh", { size: 14 })}</button>
        </div>
        <p style="font-size:14.5px;line-height:1.55;margin:0">${esc(readerProfileText)}</p>
        <p class="muted small" style="margin-top:8px">Updates weekly from your activity${navigator.onLine ? "" : " (you're offline right now, but this still works — it's computed on this device)"}.</p>
      </div>

      <div class="pillstats rise d1">
        <div class="pillstat"><div class="n">${Math.round(g.totalMin / 60)}h</div><div class="l">total time</div></div>
        <div class="pillstat"><div class="n">${g.totalPages.toLocaleString()}</div><div class="l">pages read</div></div>
        <div class="pillstat"><div class="n">${icon("flame", { size: 16 })} ${g.bestStreak}</div><div class="l">best streak</div></div>
      </div>

      <div class="card rise d2">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="eyebrow" style="margin:0">Achievements · ${unlockedN}/${ACHIEVEMENTS.length}</span>
          <button class="btn quiet sm" data-share-wrap>Share my week</button>
        </div>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map((a) => `<div class="ach ${S.unlocked[a.id] ? "unlocked" : ""}" title="${esc(a.d)}">
            <div class="ic">${icon(a.ic, { size: 22 })}</div><div class="t">${a.t}</div>
          </div>`).join("")}
        </div>
      </div>

      <div class="card rise d3">
        <div class="eyebrow">Appearance</div>
        <div class="theme-toggle">
          <button data-theme="light" class="${S.settings.theme === "light" ? "active" : ""}">${icon("sun", { size: 16 })} Light</button>
          <button data-theme="dark" class="${S.settings.theme === "dark" ? "active" : ""}">${icon("moon", { size: 16 })} Dark</button>
          <button data-theme="auto" class="${S.settings.theme === "auto" ? "active" : ""}">${icon("refresh", { size: 15 })} Auto</button>
        </div>
      </div>

      <div class="card rise d3">
        <div class="eyebrow">Account</div>
        ${accountSectionHTML()}
      </div>

      <div class="card rise d3">
        <div class="eyebrow">Recent shares</div>
        ${(S.shareHistory || []).length ? `
          <div class="share-history">
            ${S.shareHistory.slice(0, 6).map((h) => `
              <div class="share-hist-row" data-reshare="${h.id}">
                ${h.coverUrl ? `<img class="cover" src="${h.coverUrl}" alt="">` : genCoverHTML({ t: h.title, a: h.subtitle, g: h.book?.g }, "cover")}
                <div class="meta">
                  <div class="t">${esc(h.title)}</div>
                  <div class="muted small">${esc(h.kicker)} · ${esc(h.dateStr)}</div>
                </div>
                <button class="btn sm ghost">${icon("share", { size: 13 })} Share again</button>
              </div>`).join("")}
          </div>` : `<p class="muted small">Nothing shared yet — cards you generate (even if you close them without sharing) will show up here so you can send them later.</p>`}
      </div>

      <div class="card rise d3">
        <div class="eyebrow">Your taste</div>
        <div class="chips" style="margin-top:6px">
          ${S.profile.genres.map((id) => `<span class="chip gold">${GENRES.find((g2) => g2.id === id)?.label}</span>`).join("")}
          ${S.profile.moods.map((id) => `<span class="chip">${MOODS.find((m) => m.id === id)?.label}</span>`).join("")}
        </div>
        <div class="btn-row">
          <button class="btn ghost sm" id="pf-edit">Retune taste & goal</button>
        </div>
      </div>

      <div class="card rise d4">
        <div class="eyebrow">Your data, yours</div>
        <p class="muted small">Everything lives on this device. Export a JSON backup anytime; import it on any other device.</p>
        <div class="btn-row">
          <button class="btn ghost sm" id="pf-export">${icon("download", { size: 14 })} Export backup</button>
          <button class="btn ghost sm" id="pf-import">Import backup</button>
          <input type="file" id="pf-file" accept="application/json" class="hidden">
          <button class="btn quiet sm" id="pf-reset" style="color:var(--ember)">Reset everything</button>
        </div>
      </div>
    </div>`;

  wireTopbar(root);
  $("[data-share-wrap]", root).addEventListener("click", () => openShareCard({ kind: "weekstats" }));
  $("#pf-avatar-btn", root).addEventListener("click", openAvatarPicker);
  $("#pf-name-btn", root).addEventListener("click", openRenameSheet);
  $("#acct-google", root)?.addEventListener("click", signInWithGoogle);
  $("#acct-signout", root)?.addEventListener("click", signOutCloud);
  $("#acct-retry", root)?.addEventListener("click", () => pushCloudData(false));
  $("#pf-refresh-profile", root).addEventListener("click", () => {
    ensureReaderProfileFresh(true);
    render();
    toast("Refreshed.");
  });
  $$("[data-reshare]", root).forEach((row) => row.querySelector("button").addEventListener("click", () => {
    const entry = S.shareHistory.find((h) => h.id === row.dataset.reshare);
    if (entry) openShareCard({ kind: "history", data: entry });
  }));
  $$("[data-theme]", root).forEach((b) => b.addEventListener("click", () => {
    S.settings.theme = b.dataset.theme; saveState(); applyTheme(); render();
  }));
  $("#pf-export", root).addEventListener("click", exportJSON);
  $("#pf-import", root).addEventListener("click", () => $("#pf-file", root).click());
  $("#pf-file", root).addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    importJSON(f, (ok) => {
      if (ok) { applyTheme(); toast("Library restored."); if (!S.profile) runOnboarding(); else render(); }
      else toast("That file doesn't look like a Dogeared backup.");
    });
  });
  $("#pf-reset", root).addEventListener("click", () => {
    if (!confirm("Erase your entire reading life on this device? Export a backup first if unsure.")) return;
    localStorage.removeItem(DB_KEY); localStorage.removeItem(TIMER_KEY);
    location.reload();
  });
  $("#pf-edit", root).addEventListener("click", openTasteEditor);
}

function openTasteEditor() {
  const picks = { genres: [...S.profile.genres], moods: [...S.profile.moods], goal: S.profile.dailyGoal };
  const draw = (sheet) => {
    $("#te-body", sheet).innerHTML = `
      <div class="eyebrow">Genres</div>
      <div class="pick-grid" style="margin:8px 0 16px">
        ${GENRES.map((g) => `<button class="pick ${picks.genres.includes(g.id) ? "on" : ""}" data-g="${g.id}"><span class="em">${icon(g.ic, { size: 18 })}</span>${g.label}</button>`).join("")}
      </div>
      <div class="eyebrow">Moods</div>
      <div class="pick-grid moods" style="margin:8px 0 16px">
        ${MOODS.map((m) => `<button class="pick ${picks.moods.includes(m.id) ? "on" : ""}" data-m="${m.id}"><span class="em">${icon(m.ic, { size: 18 })}</span>${m.label}</button>`).join("")}
      </div>
      <div class="eyebrow">Daily pages · <strong id="te-g">${picks.goal}</strong></div>
      <input type="range" id="te-range" min="5" max="100" step="5" value="${picks.goal}" style="margin-top:8px">`;
    $$("[data-g]", sheet).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.g;
      picks.genres = picks.genres.includes(id) ? picks.genres.filter((x) => x !== id) : [...picks.genres, id];
      draw(sheet);
    }));
    $$("[data-m]", sheet).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.m;
      picks.moods = picks.moods.includes(id) ? picks.moods.filter((x) => x !== id) : [...picks.moods, id];
      draw(sheet);
    }));
    $("#te-range", sheet).addEventListener("input", (e) => {
      picks.goal = +e.target.value; $("#te-g", sheet).textContent = picks.goal;
    });
  };
  openSheet(`
    <h2 style="margin-bottom:12px">Retune your taste</h2>
    <div id="te-body"></div>
    <div class="btn-row"><button class="btn solid" id="te-save">Save</button></div>
  `, (sheet) => {
    draw(sheet);
    $("#te-save", sheet).addEventListener("click", () => {
      if (!picks.genres.length) { toast("Keep at least one genre."); return; }
      S.profile.genres = picks.genres; S.profile.moods = picks.moods; S.profile.dailyGoal = picks.goal;
      picks.genres.forEach((g) => S.affinity.genres[g] = Math.max(S.affinity.genres[g] || 0, 2));
      saveState(); closeSheet(); feedItems = []; render(); toast("Recommendations retuned.");
    });
  });
}

function openRenameSheet() {
  openSheet(`
    <h2 style="text-align:center;margin-bottom:12px">What should we call you?</h2>
    <input id="rn-name" value="${esc(S.profile.name)}" maxlength="24" placeholder="Your name or handle" style="text-align:center;font-size:19px;font-family:var(--font-d)">
    <div class="btn-row" style="justify-content:center"><button class="btn solid" id="rn-save">Save</button></div>
  `, (sheet) => {
    const input = $("#rn-name", sheet);
    input.focus(); input.select();
    $("#rn-save", sheet).addEventListener("click", () => {
      const name = input.value.trim();
      if (!name) { toast("A name, at least."); return; }
      S.profile.name = name;
      saveState(); closeSheet(); render();
      toast("Updated.");
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#rn-save", sheet).click(); });
  });
}

function openAvatarPicker() {
  let selected = S.profile.avatar || `preset:${AVATAR_PRESETS[0].id}`;
  openSheet(`
    <h2 style="text-align:center;margin-bottom:4px">Pick a face for your shelf</h2>
    <p class="muted" style="text-align:center;margin-bottom:16px">Same little reader, different mood.</p>
    <div class="avatar-grid" id="av-grid">
      ${AVATAR_PRESETS.map((p) => `<button class="avatar-opt ${selected === "preset:" + p.id ? "on" : ""}" data-av="preset:${p.id}">
        <img src="${p.file}" alt="${p.label}"><span>${p.label}</span>
      </button>`).join("")}
    </div>
    <hr class="dash">
    <div style="text-align:center">
      <button class="btn ghost sm" id="av-upload">${icon("camera", { size: 15 })} Upload your own photo</button>
      <input id="av-file" type="file" accept="image/*" class="hidden">
    </div>
    <div class="btn-row" style="justify-content:center"><button class="btn solid" id="av-save">Save avatar</button></div>
  `, (sheet) => {
    $$("[data-av]", sheet).forEach((b) => b.addEventListener("click", () => {
      selected = b.dataset.av;
      $$("[data-av]", sheet).forEach((x) => x.classList.toggle("on", x === b));
    }));
    $("#av-upload", sheet).addEventListener("click", () => $("#av-file", sheet).click());
    $("#av-file", sheet).addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      selected = await fileToDataURL(f, 320, 0.85);
      toast("Photo ready — hit Save to use it.");
      $$("[data-av]", sheet).forEach((x) => x.classList.remove("on"));
    });
    $("#av-save", sheet).addEventListener("click", () => {
      S.profile.avatar = selected;
      saveState(); closeSheet(); render();
      toast("That's you now.");
    });
  });
}

/* ================================================================
   SHEET machinery
================================================================ */
function openSheet(html, onMount) {
  closeSheet();
  const back = document.createElement("div");
  back.className = "sheet-backdrop";
  back.innerHTML = `<div class="sheet"><div class="grab"></div><button class="close-x">${icon("x", { size: 15 })}</button>${html}</div>`;
  back.addEventListener("click", (e) => { if (e.target === back) closeSheet(); });
  $(".close-x", back).addEventListener("click", closeSheet);
  document.body.appendChild(back);
  onMount && onMount($(".sheet", back));
}
function closeSheet() { $(".sheet-backdrop")?.remove(); }

document.addEventListener("cover", () => {
  if (currentView === "home" || currentView === "library") render();
});

/* ================================================================
   BACK BUTTON — closes a popup first, then goes Home, then confirms
   before actually leaving. Uses history.pushState as a "guard" so the
   hardware/gesture back button can be intercepted in stages, at every
   depth of the app, so nothing accidentally exits unconfirmed.

   The guard is always re-armed FIRST, unconditionally, before deciding
   what to do — so there's no code path where a bug in one branch could
   leave the next back-press uncaught. */
function pushBackGuard() {
  try { history.pushState({ dogeared: true }, ""); } catch {}
}
function closeTopmostOverlay() {
  const tryClick = (sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; };
  try {
    if (tryClick(".sheet-backdrop .close-x")) return true;
    if (tryClick(".journal-fs #jfs-close")) return true;
    if (tryClick(".wrap-viewer .wrap-close")) return true;
    if (tryClick(".summary #sum-done")) return true;
  } catch {}
  return false;
}
function showQuitConfirm() {
  openSheet(`
    <h2 style="text-align:center;margin-bottom:6px">Closing the book for now?</h2>
    <p class="muted" style="text-align:center">Your shelf will be exactly as you left it — nothing here needs finishing before you go.</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn ghost" id="quit-stay">Stay a while</button>
      <button class="btn solid" id="quit-yes" style="background:var(--ember)">Quit</button>
    </div>
  `, (sheet) => {
    $("#quit-stay", sheet).addEventListener("click", () => closeSheet());
    $("#quit-yes", sheet).addEventListener("click", () => {
      closeSheet();
      try { window.close(); } catch {} // best-effort; browsers largely restrict this for non-script-opened tabs
    });
  });
}
window.addEventListener("popstate", () => {
  pushBackGuard(); // always re-arm first — unconditional, no branch can skip it
  if (!S.profile) return; // onboarding has its own step-back button; let default back behavior proceed
  if (closeTopmostOverlay()) return;
  if (currentView !== "home") { navigate("home"); return; }
  showQuitConfirm();
});
/* best-effort backstop for closing via the tab/window itself (swipe-away,
   the browser's own close control) rather than the in-page back button —
   browsers own this dialog's wording, so it won't carry our brand voice,
   but it still adds one more "are you sure" before anything is lost. */
window.addEventListener("beforeunload", (e) => {
  if (!S.profile) return;
  e.preventDefault();
  e.returnValue = "";
});
// arm a guard as early as possible — don't wait for boot(), in case a back
// press happens during the brief window before the app finishes setting up
pushBackGuard();

/* ================================================================
   BOOT
================================================================ */
function boot() {
  $$("nav.tabbar [data-view]").forEach((b) => b.addEventListener("click", () => navigate(b.dataset.view)));
  if (getTimer()) navigate("timer");
  else navigate("home");
  startHeartbeat();
  // extra buffer states — some Android back-gesture implementations can
  // consume more than one history entry per swipe
  pushBackGuard();
  pushBackGuard();
  pushBackGuard();
}

if (!S.profile) {
  $("nav.tabbar").classList.add("hidden");
  runOnboarding();
  const obs = new MutationObserver(() => {
    if (S.profile) { $("nav.tabbar").classList.remove("hidden"); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true });
} else {
  boot();
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
