/* ================================================================
   DOGEAR — app.js
   Views, onboarding, timer, session summary, sheets, profile.
================================================================ */
"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const root = $("#app");
const feedRoot = $("#feed-root");

/* apply theme */
function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  $('meta[name="theme-color"]')?.setAttribute("content", S.settings.theme === "dark" ? "#16130E" : "#F3EFE1");
}
applyTheme();

/* ================================================================
   ONBOARDING — cinematic 5 steps
================================================================ */
function runOnboarding() {
  let step = 0;
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
        <img src="icons/logo.png" alt="">
        <div class="word">Dogear</div>
        <div class="tag">Build a reading life.</div>
        <p class="muted" style="max-width:34ch;margin:18px auto 0">Track sessions like workouts, keep a shelf like a gallery, and discover books that feel chosen for you.</p>
      </div>`;
      foot = `<span></span><button class="btn grad" data-next>Let's begin</button>`;
    }
    if (step === 1) {
      body = `<div class="ob-step">
        <div class="eyebrow">Step 1 · Taste</div>
        <h1>What do you love to read?</h1>
        <p class="lede">Pick a few — Dogear tunes recommendations around these.</p>
        <div class="pick-grid">
          ${GENRES.map((g) => `<button class="pick ${picks.genres.includes(g.id) ? "on" : ""}" data-g="${g.id}">
            <span class="em">${g.em}</span>${g.label}</button>`).join("")}
        </div>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn grad" data-next ${picks.genres.length ? "" : "disabled"}>
          ${picks.genres.length ? `Continue (${picks.genres.length})` : "Pick at least one"}</button>`;
    }
    if (step === 2) {
      body = `<div class="ob-step">
        <div class="eyebrow">Step 2 · Vibe</div>
        <h1>What reading mood are you chasing?</h1>
        <p class="lede">Choose your favorite vibes. We'll match the feeling, not just the shelf label.</p>
        <div class="pick-grid moods">
          ${MOODS.map((m) => `<button class="pick ${picks.moods.includes(m.id) ? "on" : ""}" data-m="${m.id}">
            <span class="em">${m.em}</span>${m.label}</button>`).join("")}
        </div>
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn grad" data-next ${picks.moods.length ? "" : "disabled"}>
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
      foot = `<button class="btn quiet" data-back>Back</button><button class="btn grad" data-next>Continue</button>`;
    }
    if (step === 4) {
      body = `<div class="ob-step" style="text-align:center">
        <div class="eyebrow">Step 4 · You</div>
        <h1>What should we call you?</h1>
        <p class="lede">It signs your shelf, your stats, and your share cards.</p>
        <input id="ob-name" placeholder="Your name or handle" value="${esc(picks.name)}" maxlength="24"
          style="max-width:320px;margin:0 auto;text-align:center;font-size:19px;font-family:var(--font-d)">
      </div>`;
      foot = `<button class="btn quiet" data-back>Back</button>
        <button class="btn grad" data-next ${picks.name.trim() ? "" : "disabled"}>Open my library</button>`;
    }

    ob.innerHTML = `<div class="aurora"></div><div class="ob-inner">${prog}${body}<div class="ob-foot">${foot}</div></div>`;

    /* wire */
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

function navigate(v) {
  currentView = v;
  $$("nav.tabbar [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  feedRoot.classList.toggle("hidden", v !== "discover");
  root.classList.toggle("hidden", v === "discover");
  render();
  if (v !== "discover") window.scrollTo({ top: 0 });
}
function render() {
  if (currentView === "home") renderHome();
  else if (currentView === "discover") renderDiscover();
  else if (currentView === "library") renderLibrary();
  else if (currentView === "timer") renderTimer();
  else if (currentView === "profile") renderProfile();
}

const topbar = (extra = "") => `
  <div class="topbar">
    <div class="brand"><img src="icons/logo.png" alt=""><span class="word">Dogear</span></div>
    <div style="display:flex;gap:8px">
      ${extra}
      <button class="iconbtn" data-theme-toggle title="Toggle theme">${S.settings.theme === "dark" ? "☀️" : "🌙"}</button>
    </div>
  </div>`;

function wireTopbar(scope = document) {
  $("[data-theme-toggle]", scope)?.addEventListener("click", () => {
    S.settings.theme = S.settings.theme === "dark" ? "light" : "dark";
    saveState(); applyTheme(); render();
  });
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
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const [q, who] = QUOTES[doy % QUOTES.length];
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Reading past midnight" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const motivation = pToday >= goal
    ? "Ring closed. The rest of tonight's pages are pure indulgence."
    : pToday > 0
    ? `${goal - pToday} pages to close your ring. One chapter should do it.`
    : g.streak > 0
    ? `Your ${g.streak}-day ritual is warm. Five minutes keeps the flame.`
    : "Every reading life starts with one page. Today's is waiting.";

  root.innerHTML = `
    ${topbar(`<button class="iconbtn" data-open-search title="Search books">🔍</button>`)}
    <div class="view">
      <div class="hello rise"><div class="hi">${greet}</div><h1>${esc(S.profile.name)}</h1></div>

      <div class="card eared ring-card rise d1" style="margin-top:16px">
        <div class="ring-wrap">
          <svg width="118" height="118" viewBox="0 0 118 118">
            <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#BDAD25"/><stop offset="1" stop-color="#C25E36"/>
            </linearGradient></defs>
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
        <div class="pillstat"><div class="n"><span class="flame">🔥</span> ${g.streak}</div><div class="l">day streak</div></div>
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
            <button class="btn sm grad" data-read="${b.id}" style="align-self:center">Read</button>
          </div>`;
        }).join("")
        : `<div class="card empty rise d3">
            <img src="icons/logo.png" alt="">
            <div class="serif">Nothing on the nightstand.</div>
            <p>Find your next book in Discover — it already knows your taste.</p>
            <button class="btn grad" data-go-discover style="margin-top:10px">Open Discover</button>
          </div>`}

      <div class="card rise d3">
        <div class="eyebrow">Reading heatmap · last 15 weeks</div>
        ${heatmapHTML()}
      </div>

      <div class="card eared quote-block rise d4">
        <div class="q">“${esc(q)}”</div><div class="w">— ${esc(who)}</div>
      </div>
    </div>`;

  wireTopbar(root);
  $("[data-go-discover]", root)?.addEventListener("click", () => navigate("discover"));
  $$("[data-read]", root).forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation(); startTimer(b.dataset.read); navigate("timer");
  }));
  $$("[data-book]", root).forEach((el) => el.addEventListener("click", () => openBookSheet(el.dataset.book)));
}

function heatmapHTML() {
  const map = minutesByDate();
  const weeks = 15;
  const end = new Date();
  const start = new Date(); start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  let cells = "";
  const d = new Date(start);
  while (d <= end) {
    const m = map[todayStr(d)] || 0;
    const lvl = m >= 60 ? 4 : m >= 30 ? 3 : m >= 15 ? 2 : m >= 5 ? 1 : 0;
    cells += `<i class="${lvl ? "l" + lvl : ""}" title="${todayStr(d)}: ${m}m"></i>`;
    d.setDate(d.getDate() + 1);
  }
  return `<div class="heatmap">${cells}</div>`;
}

/* ================================================================
   DISCOVER — vertical snap feed
================================================================ */
let feedItems = [];
function renderDiscover() {
  if (!feedItems.length) feedItems = recommendationFeed(8);
  feedRoot.innerHTML = `
    <div class="feed" id="feed">
      <div class="feed-hint">Swipe for your next book</div>
      <div class="feed-topbtns">
        <button class="iconbtn" data-open-search title="Search">🔍</button>
        <button class="iconbtn" data-theme-toggle>${S.settings.theme === "dark" ? "☀️" : "🌙"}</button>
      </div>
      ${feedItems.map(feedCardHTML).join("")}
      <div class="feed-card" id="feed-more">
        <div class="bgwash" style="background:var(--grad)"></div>
        <div class="fc-inner" style="justify-content:center;min-height:60vh">
          <div class="fc-title serif">Still curious?</div>
          <p class="fc-blurb">The more you read, save, and skip, the sharper this feed gets.</p>
          <button class="btn main" data-more style="background:#FFF6E6;color:#2C261D">Deal me more</button>
        </div>
      </div>
    </div>`;

  wireTopbar(feedRoot);
  wireFeed();
  // resolve covers lazily
  feedItems.forEach((cb) => resolveCatalogCover(cb).then((url) => {
    if (!url) return;
    const card = $(`[data-fc="${cb.id}"]`, feedRoot);
    if (!card) return;
    $(".bgcover", card).style.backgroundImage = `url(${url})`;
    const cov = $(".fc-cover", card);
    cov.outerHTML = `<img class="cover xl fc-cover" src="${url}" alt="">`;
  }));
}

function feedCardHTML(cb) {
  const hue = GENRE_HUES[cb.g[0]] || ["#6B5B3F", "#2E2618"];
  const gl = cb.g.map((g) => GENRES.find((x) => x.id === g)?.label).filter(Boolean);
  return `<div class="feed-card" data-fc="${cb.id}">
    <div class="bgwash" style="background:linear-gradient(160deg,${hue[0]},${hue[1]})"></div>
    <div class="bgcover"></div>
    <div class="fc-inner">
      ${genCoverHTML(cb, "cover xl fc-cover")}
      <div class="fc-title">${esc(cb.t)}</div>
      <div class="fc-author">${esc(cb.a)} · ${cb.y}</div>
      <div class="fc-meta">
        <span class="chip">${"★".repeat(Math.round(cb.r))}<span style="opacity:.7"> ${cb.r}</span></span>
        <span class="chip">${cb.p} pages</span>
        ${gl.slice(0, 2).map((l) => `<span class="chip">${l}</span>`).join("")}
      </div>
      <div class="fc-blurb">${esc(cb.b)}</div>
      <div class="fc-why">${esc(whyForYou(cb))}</div>
      <div class="fc-actions">
        <button class="btn main" data-fc-start="${cb.id}">Start reading</button>
        <button class="btn" data-fc-save="${cb.id}">＋ Wishlist</button>
        <button class="btn" data-fc-skip="${cb.id}">Skip</button>
      </div>
    </div>
  </div>`;
}

function wireFeed() {
  $$("[data-fc-start]", feedRoot).forEach((b) => b.addEventListener("click", () => {
    const cb = CATALOG.find((c) => c.id === b.dataset.fcStart);
    const book = addBookFromCatalog(cb, "reading");
    toast(`“${cb.t}” is now on your nightstand.`);
    checkAchievements(); saveState();
    openBookSheet(book.id);
  }));
  $$("[data-fc-save]", feedRoot).forEach((b) => b.addEventListener("click", () => {
    const cb = CATALOG.find((c) => c.id === b.dataset.fcSave);
    addBookFromCatalog(cb, "wishlist");
    S.seenFeed.push(cb.id); saveState();
    toast("Saved to your wishlist.");
    b.textContent = "✓ Saved"; b.disabled = true;
  }));
  $$("[data-fc-skip]", feedRoot).forEach((b) => b.addEventListener("click", () => {
    const cb = CATALOG.find((c) => c.id === b.dataset.fcSkip);
    learnFrom(cb, "skip");
    if (!S.seenFeed.includes(cb.id)) S.seenFeed.push(cb.id);
    saveState();
    const card = b.closest(".feed-card");
    card.nextElementSibling?.scrollIntoView({ behavior: "smooth" });
    toast("Noted — fewer like this.");
  }));
  $("[data-more]", feedRoot)?.addEventListener("click", () => {
    feedItems.forEach((c) => { if (!S.seenFeed.includes(c.id)) S.seenFeed.push(c.id); });
    saveState();
    feedItems = recommendationFeed(8);
    renderDiscover();
    $("#feed").scrollTop = 0;
  });
}

/* ================================================================
   SEARCH (Open Library)
================================================================ */
function openSearch() {
  openSheet(`
    <div class="search-head">
      <input id="q" placeholder="Title, author, ISBN, theme…" autocomplete="off">
      <button class="btn sm" id="go">Search</button>
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
                ${d.r ? `<span class="stars">${"★".repeat(Math.round(d.r))}</span> ${d.r} · ` : ""}${d.p ? d.p + " pages" : ""}
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
      <button class="btn grad" data-add="reading">Start reading</button>
      <button class="btn ghost" data-add="wishlist">＋ Wishlist</button>
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
      <button class="btn grad" id="mb-save">${b ? "Save" : "Add book"}</button>
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
    ${topbar(`<button class="iconbtn" data-open-search title="Search books">🔍</button>`)}
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
        <img src="icons/logo.png" alt="">
        <div class="serif">${{
          reading: "Nothing open right now.",
          finished: "Finished books gather here, dog-eared and loved.",
          wishlist: "The wishlist awaits its first temptation.",
          favorites: "Mark the books that marked you.",
          dropped: "No abandoned books. (It's allowed, though.)",
        }[libFilter]}</div>
        <button class="btn grad" data-go-discover style="margin-top:12px">Find a book</button>
      </div>`}
    </div>`;

  wireTopbar(root);
  $$("[data-f]", root).forEach((b) => b.addEventListener("click", () => { libFilter = b.dataset.f; renderLibrary(); }));
  $$("[data-book]", root).forEach((el) => el.addEventListener("click", () => openBookSheet(el.dataset.book)));
  $("[data-go-discover]", root)?.addEventListener("click", () => navigate("discover"));
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
      ${b.shelf === "reading" ? `<button class="btn grad" data-act="read">Start session</button>` : `<button class="btn grad" data-act="startbook">Start reading</button>`}
      ${b.shelf !== "finished" ? `<button class="btn ghost" data-act="finish">Mark finished</button>` : `<button class="btn ghost" data-act="card">Share card</button>`}
      <button class="btn ghost" data-act="fav">${b.fav ? "♥ Favorited" : "♡ Favorite"}</button>
      <button class="btn ghost" data-act="note">＋ Note / quote</button>
      <button class="btn quiet" data-act="edit">Edit</button>
      ${b.shelf !== "dropped" && b.shelf !== "finished" ? `<button class="btn quiet" data-act="drop" style="color:var(--ember)">Drop it</button>` : ""}
    </div>

    ${b.shelf === "finished" ? `
      <hr class="dash">
      <div class="eyebrow">Your verdict</div>
      <div class="ratestars" id="rate">${[1,2,3,4,5].map((i) => `<span data-r="${i}" class="${i <= (b.rating||0) ? "on" : ""}">★</span>`).join("")}</div>
      <textarea id="rev" placeholder="How did you like the ending?" style="margin-top:10px">${esc(b.review || "")}</textarea>
      <div class="btn-row"><button class="btn sm" id="rev-save">Save review</button></div>` : ""}

    ${notes.length ? `<hr class="dash"><div class="eyebrow">Notes & quotes</div>
      ${notes.slice(0, 5).map((n) => `
        <p style="font-family:var(--font-d);font-size:15.5px;${n.kind === "quote" ? "font-style:italic" : ""}">
          ${n.kind === "quote" ? "❝ " : ""}${esc(n.text)}${n.kind === "quote" ? " ❞" : ""}
          <span class="muted small" style="font-family:var(--font-b)"> · ${fmtDateNice(n.createdAt)}</span></p>`).join("")}` : ""}

    ${st.sessions ? `<hr class="dash"><div class="eyebrow">Sessions</div>
      ${bookSessions(b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((s) => `
        <div class="session-item"><span>${fmtDateNice(s.date)}${s.mood ? " " + s.mood : ""}</span>
        <span class="muted">${fmtHM(s.minutes)}${s.endPage ? ` · to p.${s.endPage}` : ""}</span></div>`).join("")}
      <div class="btn-row"><button class="btn quiet sm" data-act="backlog">＋ Log a past session</button></div>`
      : `<div class="btn-row"><button class="btn quiet sm" data-act="backlog">＋ Log a past session</button></div>`}

    ${sims.length ? `<hr class="dash"><div class="eyebrow">You may also like</div>
      <div class="seg" style="margin:8px -20px 0;padding:4px 20px 8px">
        ${sims.map((c) => `<div data-sim="${c.id}" style="flex:0 0 92px;cursor:pointer">
          ${genCoverHTML(c, "cover")}
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
      if (act === "note") { closeSheet(); openNoteEditor(b.id); }
      if (act === "edit") { closeSheet(); openManualAdd(b); }
      if (act === "drop") { moveShelf(b, "dropped"); closeSheet(); render(); toast("Dropped. Life's too short — no guilt."); }
      if (act === "card") { closeSheet(); openShareCard({ kind: "book", book: b }); }
      if (act === "backlog") { closeSheet(); openBacklog(b); }
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
      const cb = CATALOG.find((c) => c.id === el.dataset.sim);
      closeSheet();
      openCatalogPreview(cb);
    }));
    // live cover swap once resolved
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
    <p class="fc-why" style="display:block;text-align:center;background:var(--grad-soft);color:var(--ink);border-radius:99px;padding:7px 16px;font-family:var(--font-d);font-style:italic;font-size:13.5px;margin:6px auto;max-width:fit-content">${esc(whyForYou(cb))}</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn grad" id="cp-start">Start reading</button>
      <button class="btn ghost" id="cp-save">＋ Wishlist</button>
    </div>
  `, (sheet) => {
    resolveCatalogCover(cb).then((url) => {
      if (url) $(".cover", sheet).outerHTML = `<img class="cover xl" src="${url}">`;
    });
    $("#cp-start", sheet).addEventListener("click", () => {
      const book = addBookFromCatalog(cb, "reading");
      checkAchievements(); saveState(); closeSheet(); openBookSheet(book.id);
    });
    $("#cp-save", sheet).addEventListener("click", () => {
      addBookFromCatalog(cb, "wishlist"); checkAchievements(); saveState(); closeSheet(); toast("Wishlisted.");
    });
  });
}

function openNoteEditor(bookId) {
  let kind = "note";
  openSheet(`
    <h2 style="margin-bottom:12px">Keep something</h2>
    <div class="opt-row" style="justify-content:flex-start">
      <button data-k="note" class="active">📝 Note</button>
      <button data-k="quote">❝ Quote</button>
    </div>
    <textarea id="nt" rows="5" placeholder="A thought, an argument with the author, a line worth stealing…" style="margin-top:10px"></textarea>
    <div class="btn-row"><button class="btn grad" id="nt-save">Keep it</button></div>
  `, (sheet) => {
    $$("[data-k]", sheet).forEach((b) => b.addEventListener("click", () => {
      kind = b.dataset.k;
      $$("[data-k]", sheet).forEach((x) => x.classList.toggle("active", x === b));
    }));
    $("#nt-save", sheet).addEventListener("click", () => {
      const text = $("#nt", sheet).value.trim();
      if (!text) { toast("A few words to keep."); return; }
      S.journal.push({ id: uid(), bookId, text, kind, createdAt: new Date().toISOString() });
      grantXP(XP_RULES.journalEntry, "Saved a " + kind);
      checkAchievements(); saveState(); closeSheet();
      toast(kind === "quote" ? "Pressed between the pages." : "Noted.");
      render();
    });
  });
}

function openBacklog(b) {
  openSheet(`
    <h2 style="margin-bottom:6px">Log a past session</h2>
    <p class="muted">Forgot the timer? Happens to the best of us.</p>
    <label class="field" style="margin-top:12px"><span>Date</span><input id="bl-d" type="date" max="${todayStr()}" value="${todayStr()}"></label>
    <label class="field"><span>Minutes</span><input id="bl-m" type="number" min="1" placeholder="25"></label>
    <label class="field"><span>Page reached (optional)</span><input id="bl-p" type="number" min="0" placeholder="${b.currentPage || 0}"></label>
    <div class="btn-row"><button class="btn grad" id="bl-save">Log it</button></div>
  `, (sheet) => {
    $("#bl-save", sheet).addEventListener("click", () => {
      const mins = parseInt($("#bl-m", sheet).value, 10);
      const date = $("#bl-d", sheet).value;
      if (!mins || !date) { toast("A date and some minutes."); return; }
      const endPage = parseInt($("#bl-p", sheet).value, 10) || null;
      S.sessions.push({ id: uid(), bookId: b.id, date, minutes: mins, startPage: b.currentPage || 0, endPage, mood: null, createdAt: new Date(date + "T12:00").toISOString() });
      if (endPage && endPage > (b.currentPage || 0)) b.currentPage = endPage;
      grantXP(mins * XP_RULES.perMinute + (endPage ? (endPage - (b.currentPage || 0)) * 0 : 0), "Backdated session");
      checkAchievements(); saveState(); closeSheet(); render();
      toast("Backdated and remembered.");
    });
  });
}

/* ================================================================
   TIMER — persists via timestamps (survives lock/close)
================================================================ */
let tickInt = null;
const getTimer = () => { try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch { return null; } };
const setTimer = (t) => t ? localStorage.setItem(TIMER_KEY, JSON.stringify(t)) : localStorage.removeItem(TIMER_KEY);
const elapsedMs = (t) => t ? t.acc + (t.paused ? 0 : Date.now() - t.last) : 0;

function startTimer(bookId) {
  const ex = getTimer();
  if (ex && ex.bookId !== bookId) { toast("Finish your open session first."); return; }
  if (!ex) setTimer({ bookId, last: Date.now(), acc: 0, paused: false, mood: null });
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
            <button class="btn sm grad" data-begin="${b.id}" style="align-self:center">Begin</button>
          </div>`).join("")}
        </div>` : `<div class="card empty">
          <img src="icons/logo.png" alt="">
          <div class="serif">Your bookmark is getting lonely.</div>
          <p>Start a book from Discover or Library and the clock is yours.</p>
          <button class="btn grad" data-go-discover style="margin-top:10px">Find a book</button>
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
    <div class="view ${t.paused ? "paused" : ""}">
      <div class="card eared timer-hero">
        <div class="breath"><img src="icons/logo.png" alt=""></div>
        <div class="time" id="tt">0:00</div>
        <div class="bl">${esc(book.t)} · from page ${book.currentPage || 0}</div>
        <div class="eyebrow" style="margin-top:18px">How's it feel?</div>
        <div class="mood-row">
          ${SESSION_MOODS.map(([em, l]) => `<button data-mood="${em}" title="${l}" class="${t.mood === em ? "on" : ""}">${em}</button>`).join("")}
        </div>
        <div class="btn-row" style="justify-content:center;margin-top:22px">
          <button class="btn ghost" id="tp">${t.paused ? "Resume" : "Pause"}</button>
          <button class="btn grad" id="tf">Finish session</button>
        </div>
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn quiet sm" id="tq">＋ Save a quote mid-read</button>
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
  });
  $("#tq").addEventListener("click", () => openNoteEditor(book.id));
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
      <button class="btn grad" id="fs-save">Save session</button>
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
      if (confirm("Let this session go unrecorded?")) { setTimer(null); closeSheet(); render(); }
    });
  });
}

/* ---------------- session summary (reward screen) ---------------- */
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
        <div class="cell"><div class="n">🔥 ${g.streak}</div><div class="l">${streakUp ? "streak extended" : "day streak"}</div></div>
        <div class="cell"><div class="n">${finished ? "100%" : pc !== null ? pc + "%" : st.sessions}</div><div class="l">${finished || pc !== null ? "complete" : "sessions"}</div></div>
      </div>
      <div><span class="xp-pop">✦ +${Math.round(xp)} XP</span></div>
      ${fresh.map((a) => `<div class="ach-pop"><span class="chip gold" style="font-size:13px;padding:8px 16px">${a.ic} Achievement — ${a.t}</span></div>`).join("")}
      ${finished ? `<p class="muted" style="margin-top:18px">“${esc(book.t)}” joins your finished shelf. Rate it while it's still humming.</p>` : ""}
      <div class="btn-row" style="justify-content:center;margin-top:26px">
        <button class="btn grad" id="sum-share">Share this</button>
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
   SHARE CARDS
================================================================ */
function openShareCard(cfg) {
  let theme = "dawn";
  const g = globalStats();

  const build = (canvas) => {
    if (cfg.kind === "book") {
      const st = bookStats(cfg.book.id);
      drawShareCard(canvas, {
        theme, kind: "book", book: cfg.book,
        coverUrl: cfg.book.cover,
        kicker: "finished & dog-eared",
        title: cfg.book.t, subtitle: cfg.book.a,
        stars: cfg.book.rating || null,
        stats: [
          [cfg.book.p || st.pages || "—", "pages"],
          [fmtHM(st.minutes), "time inside"],
          [st.days || 1, "reading days"],
          ["🔥 " + g.streak, "day streak"],
        ],
        profileName: S.profile.name,
      });
    } else if (cfg.kind === "session") {
      drawShareCard(canvas, {
        theme, kind: "wrap",
        kicker: "reading session",
        title: cfg.book.t, subtitle: cfg.book.a,
        stats: [
          [cfg.session.pagesRead, "pages"],
          [fmtHM(cfg.session.minutes), "duration"],
          [cfg.session.pace ? cfg.session.pace + "/h" : "—", "pace"],
          ["🔥 " + g.streak, "day streak"],
        ],
        profileName: S.profile.name,
      });
    } else {
      drawShareCard(canvas, {
        theme, kind: "wrap",
        kicker: "my reading life",
        title: `${g.finished} books & counting`,
        subtitle: `${Math.round(g.totalMin / 60)} hours inside other worlds`,
        stats: [
          [g.totalPages, "pages read"],
          [fmtHM(g.totalMin), "total time"],
          ["🔥 " + g.bestStreak, "best streak"],
          ["Lv " + levelForXP(S.xp), "reader level"],
        ],
        profileName: S.profile.name,
      });
    }
  };

  openSheet(`
    <h2 style="text-align:center;margin-bottom:4px">Share it beautifully</h2>
    <p class="muted" style="text-align:center">Made for Stories, Threads, and group chats.</p>
    <div class="share-wrap" style="margin-top:12px"><canvas id="sc" width="1080" height="1350"></canvas></div>
    <div class="opt-row">
      ${Object.keys(CARD_THEMES).map((k) => `<button data-th="${k}" class="${k === theme ? "active" : ""}">${k}</button>`).join("")}
    </div>
    <div class="btn-row" style="justify-content:center">
      <button class="btn grad" id="sc-share">Share</button>
      <button class="btn ghost" id="sc-dl">Save image</button>
    </div>
  `, (sheet) => {
    const canvas = $("#sc", sheet);
    build(canvas);
    $$("[data-th]", sheet).forEach((b) => b.addEventListener("click", () => {
      theme = b.dataset.th;
      $$("[data-th]", sheet).forEach((x) => x.classList.toggle("active", x === b));
      build(canvas);
    }));
    $("#sc-dl", sheet).addEventListener("click", () => {
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dogear-card.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      });
    });
    $("#sc-share", sheet).addEventListener("click", () => {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "dogear.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: "Dogear" }); } catch {}
        } else { toast("Native share unavailable — saving instead."); $("#sc-dl", sheet).click(); }
      });
    });
  });
}

/* ================================================================
   PROFILE
================================================================ */
function renderProfile() {
  const g = globalStats();
  const lv = levelForXP(S.xp);
  const cur = xpForLevel(lv), next = xpForLevel(lv + 1);
  const lvPct = Math.min(100, Math.round((S.xp - cur) / (next - cur) * 100));
  const unlockedN = Object.keys(S.unlocked).length;

  root.innerHTML = `${topbar()}
    <div class="view">
      <h1 style="margin-bottom:16px">${esc(S.profile.name)}</h1>

      <div class="card eared level-card rise">
        <div class="level-badge"><div class="n">${lv}</div><div class="l">LEVEL</div></div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <strong style="font-weight:400">${S.xp.toLocaleString()} XP</strong>
            <span class="muted small">${next - S.xp} to level ${lv + 1}</span>
          </div>
          <div class="xpbar"><i style="width:${lvPct}%"></i></div>
          <p class="muted small" style="margin-top:7px">XP grows with minutes, pages, finished books, notes, and streaks.</p>
        </div>
      </div>

      <div class="pillstats rise d1">
        <div class="pillstat"><div class="n">${Math.round(g.totalMin / 60)}h</div><div class="l">total time</div></div>
        <div class="pillstat"><div class="n">${g.totalPages.toLocaleString()}</div><div class="l">pages read</div></div>
        <div class="pillstat"><div class="n">🔥 ${g.bestStreak}</div><div class="l">best streak</div></div>
      </div>

      <div class="card rise d2">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="eyebrow" style="margin:0">Achievements · ${unlockedN}/${ACHIEVEMENTS.length}</span>
          <button class="btn quiet sm" data-share-wrap>Share my stats</button>
        </div>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map((a) => `<div class="ach ${S.unlocked[a.id] ? "unlocked" : ""}" title="${esc(a.d)}">
            <div class="ic">${a.ic}</div><div class="t">${a.t}</div>
          </div>`).join("")}
        </div>
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
          <button class="btn ghost sm" id="pf-export">Export backup</button>
          <button class="btn ghost sm" id="pf-import">Import backup</button>
          <input type="file" id="pf-file" accept="application/json" class="hidden">
          <button class="btn quiet sm" id="pf-reset" style="color:var(--ember)">Reset everything</button>
        </div>
      </div>
    </div>`;

  wireTopbar(root);
  $("[data-share-wrap]", root).addEventListener("click", () => openShareCard({ kind: "wrap" }));
  $("#pf-export", root).addEventListener("click", exportJSON);
  $("#pf-import", root).addEventListener("click", () => $("#pf-file", root).click());
  $("#pf-file", root).addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    importJSON(f, (ok) => {
      if (ok) { applyTheme(); toast("Library restored."); if (!S.profile) runOnboarding(); else render(); }
      else toast("That file doesn't look like a Dogear backup.");
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
        ${GENRES.map((g) => `<button class="pick ${picks.genres.includes(g.id) ? "on" : ""}" data-g="${g.id}"><span class="em">${g.em}</span>${g.label}</button>`).join("")}
      </div>
      <div class="eyebrow">Moods</div>
      <div class="pick-grid moods" style="margin:8px 0 16px">
        ${MOODS.map((m) => `<button class="pick ${picks.moods.includes(m.id) ? "on" : ""}" data-m="${m.id}"><span class="em">${m.em}</span>${m.label}</button>`).join("")}
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
    <div class="btn-row"><button class="btn grad" id="te-save">Save</button></div>
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

/* ================================================================
   SHEET machinery
================================================================ */
function openSheet(html, onMount) {
  closeSheet();
  const back = document.createElement("div");
  back.className = "sheet-backdrop";
  back.innerHTML = `<div class="sheet"><div class="grab"></div><button class="close-x" aria-label="Close">✕</button>${html}</div>`;
  back.addEventListener("click", (e) => { if (e.target === back) closeSheet(); });
  $(".close-x", back).addEventListener("click", closeSheet);
  document.body.appendChild(back);
  onMount && onMount($(".sheet", back));
}
function closeSheet() { $(".sheet-backdrop")?.remove(); }

/* live cover updates */
document.addEventListener("cover", (e) => {
  // re-render lightweight views when a cover resolves
  if (currentView === "home" || currentView === "library") render();
});

/* ================================================================
   BOOT
================================================================ */
function boot() {
  $$("nav.tabbar [data-view]").forEach((b) => b.addEventListener("click", () => navigate(b.dataset.view)));
  $(".tabbar .cta").addEventListener("click", () => navigate("timer"));
  if (getTimer()) navigate("timer");
  else navigate("home");
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
