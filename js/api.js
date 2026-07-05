/* ================================================================
   DOGEARED — api.js  (Open Library search & metadata)
   + share-card renderer: 9:16, solid color (no gradients),
   with a transparent, cover-free export mode.
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
   SHARE CARD — 9:16, solid color per theme, premium & flat.
   opts: {
     theme, kind:'book'|'wrap', book, coverUrl, kicker, title, subtitle,
     stars, stats:[[n,l],...], profileName, transparent:boolean
   }
   Canvas is 1080×1920. In transparent mode: no fill, no cover, no fold —
   just the wordmark, title, and stats, meant to overlay on your own photo.
================================================================ */
const CARD_THEMES = {
  dawn:   "#BDAD25",
  dusk:   "#7A3A52",
  forest: "#2F4F3E",
  night:  "#1C1710",
  paper:  "#EFECDB",
};

function drawShareCard(canvas, opts) {
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const transparent = !!opts.transparent;
  const solid = CARD_THEMES[opts.theme] || CARD_THEMES.dawn;
  const isPaper = opts.theme === "paper";
  const INK = transparent ? "#2C261D" : (isPaper ? "#2C261D" : "#FFF7E8");
  const SUB = transparent ? "rgba(44,38,29,.7)" : (isPaper ? "rgba(44,38,29,.62)" : "rgba(255,247,232,.72)");

  ctx.clearRect(0, 0, W, H);
  if (!transparent) {
    ctx.fillStyle = solid;
    ctx.fillRect(0, 0, W, H);
    // dog-ear fold — solid, no gradient
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath(); ctx.moveTo(W - 120, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 120); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.moveTo(W - 120, 0); ctx.lineTo(W - 120, 120); ctx.lineTo(W, 120); ctx.closePath(); ctx.fill();
  }

  const finishText = (coverBottom) => {
    ctx.textAlign = "center";
    ctx.fillStyle = SUB;
    ctx.font = "500 26px Outfit, Arial, sans-serif";
    ctx.fillText((opts.kicker || "READING LOG").toUpperCase().split("").join("\u200A"), W / 2, 100);

    const titleY = transparent ? 260 : coverBottom + 90;
    ctx.fillStyle = INK;
    ctx.font = "300 60px Newsreader, Georgia, serif";
    wrapT(ctx, opts.title, W / 2, titleY, W - 190, 68);
    let y2 = titleY + 68;
    if (opts.subtitle) {
      ctx.fillStyle = SUB;
      ctx.font = "300 32px Outfit, Arial, sans-serif";
      ctx.fillText(opts.subtitle, W / 2, y2 + 20);
      y2 += 20;
    }
    if (opts.stars) {
      ctx.fillStyle = isPaper || transparent ? "#A0732F" : "#FFE9A8";
      ctx.font = "42px Georgia, serif";
      let st = ""; for (let i = 1; i <= 5; i++) st += i <= opts.stars ? "★" : "☆";
      ctx.fillText(st, W / 2, y2 + 80);
      y2 += 80;
    }

    // stat grid (2x2), positioned relative to remaining space
    const stats = opts.stats.slice(0, 4);
    const gridTop = Math.max(y2 + 170, transparent ? 620 : coverBottom + 420);
    const gx = [W * 0.28, W * 0.72], gy = [gridTop, gridTop + 150];
    stats.forEach(([n, l], i) => {
      const x = gx[i % 2], y = gy[Math.floor(i / 2)];
      ctx.fillStyle = INK;
      ctx.font = "300 58px Newsreader, Georgia, serif";
      ctx.fillText(String(n), x, y);
      ctx.fillStyle = SUB;
      ctx.font = "400 22px Outfit, Arial, sans-serif";
      ctx.fillText(String(l).toUpperCase(), x, y + 36);
    });

    // footer
    ctx.strokeStyle = SUB;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([2, 9]); ctx.beginPath();
    ctx.moveTo(140, H - 110); ctx.lineTo(W - 140, H - 110); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = SUB;
    ctx.font = "400 26px Outfit, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`@${opts.profileName || "reader"}`, 96, H - 52);
    ctx.textAlign = "right";
    ctx.font = "300 28px Newsreader, Georgia, serif";
    ctx.fillText("D O G E A R E D", W - 96, H - 52);

    opts.onDone && opts.onDone();
  };

  if (opts.kind === "book" && !transparent) {
    const cw = 400, ch = 600, cx = W / 2 - cw / 2, cy = 150;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    if (opts.coverUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { roundImg(ctx, img, cx, cy, cw, ch, 18); ctx.restore(); finishText(cy + ch); };
      img.onerror = () => { placeholder(); ctx.restore(); finishText(cy + ch); };
      img.src = opts.coverUrl;
      return;
    }
    placeholder();
    ctx.restore();
    finishText(cy + ch);
    function placeholder() {
      const hue = GENRE_HUES[(opts.book?.g || [])[0]] || "#6B5B3F";
      rounded(ctx, cx, cy, cw, ch, 18); ctx.fillStyle = hue; ctx.fill();
      ctx.fillStyle = "#FFF7E8";
      ctx.font = "italic 300 36px Newsreader, Georgia, serif";
      ctx.textAlign = "center";
      wrapT(ctx, opts.title, W / 2, cy + ch / 2 - 20, cw - 70, 44);
    }
  } else {
    finishText(0);
  }
}
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
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
