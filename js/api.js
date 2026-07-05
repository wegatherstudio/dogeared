/* ================================================================
   DOGEAR — api.js  (Open Library search & metadata, CORS-friendly)
   + sharecard renderer
================================================================ */
"use strict";

async function olSearch(query, limit = 18) {
  const q = encodeURIComponent(query.trim());
  const url = `https://openlibrary.org/search.json?q=${q}&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,ratings_average&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("search failed");
  const data = await res.json();
  return (data.docs || []).map((d) => ({
    olKey: d.key,
    t: d.title,
    a: (d.author_name || [])[0] || "",
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    y: d.first_publish_year || null,
    p: d.number_of_pages_median || null,
    r: d.ratings_average ? Math.round(d.ratings_average * 10) / 10 : null,
    g: mapSubjects(d.subject || []),
  }));
}

function mapSubjects(subjects) {
  const s = subjects.slice(0, 30).join(" ").toLowerCase();
  const g = [];
  const has = (...ws) => ws.some((w) => s.includes(w));
  if (has("fantasy", "magic", "dragons")) g.push("fantasy");
  if (has("science fiction", "space", "dystopia")) g.push("scifi");
  if (has("romance", "love stories")) g.push("romance");
  if (has("mystery", "detective", "thriller", "crime")) g.push("mystery");
  if (has("horror", "ghost", "supernatural")) g.push("horror");
  if (has("historical fiction", "history")) g.push("historical");
  if (has("self-help", "self-improvement", "habits", "psychology")) g.push("growth");
  if (has("poetry", "poems", "essays")) g.push("poetry");
  if (has("young adult", "juvenile fiction", "teen")) g.push("ya");
  if (has("biography", "nonfiction", "non-fiction", "science", "philosophy", "memoir")) g.push("nonfic");
  if (has("classic", "classics")) g.push("classics");
  if (!g.length) g.push("litfic");
  return [...new Set(g)].slice(0, 3);
}

async function olWorkDescription(olKey) {
  try {
    const res = await fetch(`https://openlibrary.org${olKey}.json`);
    const data = await res.json();
    let d = data.description;
    if (d && typeof d === "object") d = d.value;
    if (!d) return null;
    d = d.replace(/\[.*?\]\(.*?\)/g, "").replace(/https?:\S+/g, "").trim();
    return d.length > 460 ? d.slice(0, 460).replace(/\s+\S*$/, "") + "…" : d;
  } catch { return null; }
}

/* ================================================================
   SHARE CARD — gradient, premium, Strava-style. 1080×1350 canvas.
================================================================ */
const CARD_THEMES = {
  dawn:   ["#BDAD25", "#A0732F", "#C25E36"],
  dusk:   ["#3E2E56", "#7A3A52", "#C25E36"],
  forest: ["#1E3A2F", "#3E5E3A", "#BDAD25"],
  night:  ["#17140E", "#2A2419", "#4A3C22"],
  paper:  ["#F3EFE1", "#E7DFC8", "#D8CBA6"],
};

function drawShareCard(canvas, opts) {
  // opts: {theme, kind:'book'|'wrap', book, stats, profileName, streak, dark}
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cols = CARD_THEMES[opts.theme] || CARD_THEMES.dawn;
  const paperTheme = opts.theme === "paper";
  const INK = paperTheme ? "#2C261D" : "#FFF7E8";
  const SUB = paperTheme ? "rgba(44,38,29,.62)" : "rgba(255,247,232,.72)";

  // gradient bg
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, cols[0]); grad.addColorStop(0.55, cols[1]); grad.addColorStop(1, cols[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // soft radial glows
  const glow = (x, y, r, c) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.85, H * 0.1, 520, "rgba(255,255,255,0.16)");
  glow(W * 0.1, H * 0.85, 620, "rgba(0,0,0,0.18)");

  // dog-ear fold
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.moveTo(W - 130, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 130); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.moveTo(W - 130, 0); ctx.lineTo(W - 130, 130); ctx.lineTo(W, 130); ctx.closePath(); ctx.fill();

  const finishText = () => {
    ctx.textAlign = "center";

    // header
    ctx.fillStyle = SUB;
    ctx.font = "500 26px Outfit, Arial, sans-serif";
    ctx.fillText((opts.kicker || "READING LOG").toUpperCase().split("").join("\u200A"), W / 2, 96);

    // title block
    ctx.fillStyle = INK;
    ctx.font = "300 64px Newsreader, Georgia, serif";
    wrapT(ctx, opts.title, W / 2, opts.kind === "book" ? 782 : 300, W - 200, 72);
    if (opts.subtitle) {
      ctx.fillStyle = SUB;
      ctx.font = "300 34px Outfit, Arial, sans-serif";
      ctx.fillText(opts.subtitle, W / 2, opts.kind === "book" ? 866 : 372);
    }
    if (opts.stars) {
      ctx.fillStyle = paperTheme ? "#A0732F" : "#FFE9A8";
      ctx.font = "44px Georgia, serif";
      let st = "";
      for (let i = 1; i <= 5; i++) st += i <= opts.stars ? "★" : "☆";
      ctx.fillText(st, W / 2, 934);
    }

    // stat grid (2x2)
    const stats = opts.stats.slice(0, 4);
    const gx = [W * 0.28, W * 0.72], gy = [1042, 1170];
    stats.forEach(([n, l], i) => {
      const x = gx[i % 2], y = gy[Math.floor(i / 2)];
      ctx.fillStyle = INK;
      ctx.font = "300 60px Newsreader, Georgia, serif";
      ctx.fillText(String(n), x, y);
      ctx.fillStyle = SUB;
      ctx.font = "400 23px Outfit, Arial, sans-serif";
      ctx.fillText(String(l).toUpperCase(), x, y + 38);
    });

    // footer
    ctx.strokeStyle = paperTheme ? "rgba(44,38,29,.3)" : "rgba(255,247,232,.4)";
    ctx.setLineDash([2, 9]); ctx.beginPath();
    ctx.moveTo(150, H - 96); ctx.lineTo(W - 150, H - 96); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = SUB;
    ctx.font = "400 26px Outfit, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`@${opts.profileName || "reader"}`, 96, H - 40);
    ctx.textAlign = "right";
    ctx.font = "300 28px Newsreader, Georgia, serif";
    ctx.fillText("D O G E A R", W - 96, H - 40);
  };

  if (opts.kind === "book") {
    const cw = 330, ch = 495, cx = W / 2 - cw / 2, cy = 170;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
    if (opts.coverUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        roundImg(ctx, img, cx, cy, cw, ch, 18);
        ctx.restore(); finishText();
        opts.onDone && opts.onDone();
      };
      img.onerror = () => { placeholderCover(); ctx.restore(); finishText(); opts.onDone && opts.onDone(); };
      img.src = opts.coverUrl;
      return;
    }
    placeholderCover();
    ctx.restore();

    function placeholderCover() {
      const hue = GENRE_HUES[(opts.book?.g || [])[0]] || ["#6B5B3F", "#2E2618"];
      const g2 = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
      g2.addColorStop(0, hue[0]); g2.addColorStop(1, hue[1]);
      rounded(ctx, cx, cy, cw, ch, 18); ctx.fillStyle = g2; ctx.fill();
      ctx.fillStyle = "#FFF7E8";
      ctx.font = "italic 300 38px Newsreader, Georgia, serif";
      ctx.textAlign = "center";
      wrapT(ctx, opts.title, W / 2, cy + ch / 2 - 20, cw - 70, 46);
    }
  }
  finishText();
}
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function roundImg(ctx, img, x, y, w, h, r) {
  ctx.save(); rounded(ctx, x, y, w, h, r); ctx.clip();
  const sc = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + w / 2 - img.width * sc / 2, y + h / 2 - img.height * sc / 2, img.width * sc, img.height * sc);
  ctx.restore();
}
function wrapT(ctx, str, x, y, maxW, lh) {
  const words = String(str || "").split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
