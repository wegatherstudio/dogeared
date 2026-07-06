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
   SHARE CARD — 9:16. Three background styles:
     'theme'       — gradient derived from the book cover's own color
     'gradient'    — the classic warm Dogeared gradient, muted for contrast
     'transparent' — no fill, no cover, meant to overlay your own photo
   Font is always warm white/cream across all three styles.
   Layout flows top-to-bottom based on actual measured text height, so
   long or short titles never overlap the author line below them.
   opts: { style, kicker, dateStr, coverUrl, book, title, subtitle,
           stars, stats:[[n,l] x4], profileName }
================================================================ */
const DEFAULT_GRADIENT = ["#9C8D1F", "#8C6329", "#A54F2E"]; // muted for legibility under white text
const INK = "#FFF7E8";
const SUB = "rgba(255,247,232,.76)";

function drawShareCard(canvas, opts) {
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const style = opts.style || "gradient";
  const transparent = style === "transparent";
  ctx.clearRect(0, 0, W, H);

  const fillBackground = (stops) => {
    if (transparent) return;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(1, stops[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.moveTo(W - 120, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 120); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.moveTo(W - 120, 0); ctx.lineTo(W - 120, 120); ctx.lineTo(W, 120); ctx.closePath(); ctx.fill();
  };

  const drawCoverPlaceholder = (cx, cy, cw, ch) => {
    const hue = GENRE_HUES[(opts.book?.g || [])[0]] || "#6B5B3F";
    rounded(ctx, cx, cy, cw, ch, 18); ctx.fillStyle = hue; ctx.fill();
    ctx.fillStyle = "#FFF7E8";
    ctx.font = "italic 300 34px Newsreader, Georgia, serif";
    ctx.textAlign = "center";
    wrapT(ctx, opts.title, W / 2, cy + ch / 2 - 20, cw - 70, 42);
  };

  /* ---- layout: the whole "cover/shelf + book details + stats" group is
     vertically centered between the fixed kicker/date zone at top and the
     fixed name/DOGEARED footer at bottom — same rule for every card type. */
  const TOP_ZONE_BOTTOM = 150;
  const BOTTOM_ZONE_TOP = H - 190;
  const COVER_W = 380, COVER_H = 570;
  const SHELF_H = 300;

  const titleLH = 64;
  ctx.font = "300 56px Newsreader, Georgia, serif";
  const titleLines = wrapLines(ctx, opts.title, W - 190).slice(0, 3);

  const hasShelf = !!(opts.shelfBooks && opts.shelfBooks.length);
  const hasCover = !hasShelf && (!!opts.coverUrl || !!opts.book);
  const visualH = hasShelf ? SHELF_H + 34 : hasCover ? COVER_H : 0;
  const gapToTitle = visualH ? 86 : 0;

  const badgeCount = Math.min((opts.badges || []).length, 12);
  const badgeRowH = badgeCount ? 96 : 0;
  const contentHeight = visualH + gapToTitle + titleLines.length * titleLH
    + (opts.subtitle ? 56 : 0) + (opts.stars ? 78 : 0) + 356 + badgeRowH;
  const startY = TOP_ZONE_BOTTOM + Math.max(0, (BOTTOM_ZONE_TOP - TOP_ZONE_BOTTOM - contentHeight) / 2);

  /* the book-details + stats block, flowing down from a given title Y */
  const drawTextBlock = (titleY) => {
    ctx.textAlign = "center";
    ctx.fillStyle = SUB;
    ctx.font = "500 24px Outfit, Arial, sans-serif";
    ctx.fillText((opts.kicker || "MY READING LIFE").toUpperCase().split("").join("\u200A"), W / 2, 92);
    if (opts.dateStr) {
      ctx.font = "400 22px Outfit, Arial, sans-serif";
      ctx.fillText(opts.dateStr, W / 2, 128);
    }

    let y = titleY;
    ctx.fillStyle = INK;
    ctx.font = "300 56px Newsreader, Georgia, serif";
    titleLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * titleLH));
    y += (titleLines.length - 1) * titleLH;

    if (opts.subtitle) {
      y += 56;
      ctx.fillStyle = SUB;
      ctx.font = "300 32px Outfit, Arial, sans-serif";
      ctx.fillText(opts.subtitle, W / 2, y);
    }
    if (opts.stars) {
      y += 78;
      ctx.fillStyle = "#FFE9A8";
      ctx.font = "42px Georgia, serif";
      let st = ""; for (let i = 1; i <= 5; i++) st += i <= opts.stars ? "★" : "☆";
      ctx.fillText(st, W / 2, y);
    }

    // stat grid — 2 columns × 2 rows, order supplied by the caller
    const stats = (opts.stats || []).slice(0, 4);
    const gridTop = y + 170;
    const gx = [W * 0.28, W * 0.72], gy = [gridTop, gridTop + 150];
    stats.forEach(([n, l], i) => {
      const x = gx[i % 2], gy_ = gy[Math.floor(i / 2)];
      ctx.fillStyle = INK;
      ctx.font = "300 56px Newsreader, Georgia, serif";
      ctx.fillText(String(n), x, gy_);
      ctx.fillStyle = SUB;
      ctx.font = "400 22px Outfit, Arial, sans-serif";
      ctx.fillText(String(l).toUpperCase(), x, gy_ + 36);
    });

    // achievement badges — small icon row, auto-sized to fit whatever's unlocked
    if (badgeCount) {
      const badgeTop = gy[1] + 66;
      const maxRowW = W - 200;
      const size = Math.max(30, Math.min(46, Math.floor((maxRowW - (badgeCount - 1) * 14) / badgeCount)));
      const gap = 14;
      const rowW = badgeCount * size + (badgeCount - 1) * gap;
      let bx = W / 2 - rowW / 2;
      const icons = (opts.badges || []).slice(0, badgeCount);
      icons.forEach((iconName) => {
        const d = (typeof ICON_PATHS !== "undefined" && ICON_PATHS[iconName]) || null;
        if (d) {
          ctx.save();
          ctx.translate(bx, badgeTop);
          ctx.scale(size / 24, size / 24);
          try {
            const p = new Path2D(d);
            ctx.strokeStyle = SUB; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.stroke(p);
          } catch {}
          ctx.restore();
        }
        bx += size + gap;
      });
    }

    // footer — always fixed at the bottom, independent of content length
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

  /* a generated bookshelf of spines — used on the weekly stats card since
     there's no single book to feature. Left-to-right, oldest-kept → newest.
     Uses each book's real cover art when available (a true cross-section
     crop, like a spine), falling back to a genre-tinted block + title
     only when a cover hasn't been resolved. */
  const drawShelf = (y, h, books) => new Promise((resolve) => {
    const margin = 90;
    const availW = W - margin * 2;
    const n = Math.min(books.length, 12);
    const chosen = books.slice(-n);
    if (!chosen.length) { resolve(); return; }
    const spineW = Math.min(88, availW / n);
    const totalW = spineW * chosen.length;
    const startX = W / 2 - totalW / 2;
    const shelfY = y + h;

    ctx.strokeStyle = "rgba(255,247,232,.5)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(startX - 22, shelfY); ctx.lineTo(startX + totalW + 22, shelfY); ctx.stroke();

    let remaining = chosen.length;
    const done = () => { remaining--; if (remaining <= 0) resolve(); };

    chosen.forEach((b, i) => {
      const jitter = [0, 16, -10, 10, -16, 6][i % 6];
      const bh = Math.max(140, h - 30 + jitter);
      const bx = startX + i * spineW;
      const by = shelfY - bh;
      const sw = spineW - 4;

      const paintArt = (img) => {
        ctx.save();
        rounded(ctx, bx + 2, by, sw, bh, 4);
        ctx.clip();
        if (img) {
          const scale = bh / img.height;
          const scaledW = img.width * scale;
          const sx = (scaledW - sw) / 2;
          ctx.drawImage(img, bx + 2 - sx, by, scaledW, bh);
          ctx.fillStyle = "rgba(0,0,0,.15)";
          ctx.fillRect(bx + 2, by, sw, bh);
        } else {
          const hue = GENRE_HUES[(b.g || [])[0]] || "#6B5B3F";
          ctx.fillStyle = hue; ctx.fillRect(bx + 2, by, sw, bh);
        }
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,.18)";
        ctx.fillRect(bx + 2, by, 3, bh);
        if (!img) {
          ctx.save();
          ctx.translate(bx + spineW / 2, shelfY - 14);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "left";
          ctx.fillStyle = "#FFF7E8";
          ctx.font = `500 ${Math.max(11, Math.min(16, spineW * 0.32))}px Outfit, Arial, sans-serif`;
          const maxLen = bh - 26;
          let title = b.t || "";
          while (ctx.measureText(title).width > maxLen && title.length > 3) title = title.slice(0, -2);
          if (title !== (b.t || "")) title = title.replace(/\s+$/, "") + "…";
          ctx.fillText(title, 0, 4);
          ctx.restore();
        }
      };

      if (b.cover) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { paintArt(img); done(); };
        img.onerror = () => { paintArt(null); done(); };
        img.src = b.cover;
      } else {
        paintArt(null);
        done();
      }
    });
  });

  if (transparent) {
    if (hasShelf) {
      drawShelf(startY, SHELF_H, opts.shelfBooks).then(() => drawTextBlock(startY + visualH + gapToTitle));
    } else {
      drawTextBlock(startY);
    }
    return;
  }

  if (hasShelf) {
    fillBackground(DEFAULT_GRADIENT);
    drawShelf(startY, SHELF_H, opts.shelfBooks).then(() => drawTextBlock(startY + visualH + gapToTitle));
    return;
  }

  const cx = W / 2 - COVER_W / 2;

  if (opts.coverUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const stops = style === "theme" ? themeStopsFromImage(img) : DEFAULT_GRADIENT;
      fillBackground(stops);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
      roundImg(ctx, img, cx, startY, COVER_W, COVER_H, 18);
      ctx.restore();
      drawTextBlock(startY + visualH + gapToTitle);
    };
    img.onerror = () => {
      const stops = style === "theme" ? themeStopsFromGenre(opts.book) : DEFAULT_GRADIENT;
      fillBackground(stops);
      drawCoverPlaceholder(cx, startY, COVER_W, COVER_H);
      drawTextBlock(startY + visualH + gapToTitle);
    };
    img.src = opts.coverUrl;
    return;
  }
  if (opts.book) {
    const stops = style === "theme" ? themeStopsFromGenre(opts.book) : DEFAULT_GRADIENT;
    fillBackground(stops);
    drawCoverPlaceholder(cx, startY, COVER_W, COVER_H);
    drawTextBlock(startY + visualH + gapToTitle);
    return;
  }
  fillBackground(DEFAULT_GRADIENT);
  drawTextBlock(startY);
}

/* ---------------- color extraction: sample the cover, build a gradient from it ---------------- */
function themeStopsFromImage(img) {
  try {
    const size = 24;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const cx = c.getContext("2d");
    cx.drawImage(img, 0, 0, size, size);
    const data = cx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    if (!n) return DEFAULT_GRADIENT;
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    return gradientFromRGB(r, g, b);
  } catch {
    return DEFAULT_GRADIENT; // canvas got tainted (no CORS) — fall back gracefully
  }
}
function themeStopsFromGenre(book) {
  const hex = GENRE_HUES[(book?.g || [])[0]] || "#6B5B3F";
  const { r, g, b } = hexToRgb(hex);
  return gradientFromRGB(r, g, b);
}
function gradientFromRGB(r, g, b) {
  const { h, s } = rgbToHsl(r, g, b);
  const satAdj = Math.max(0.32, Math.min(s, 0.7));
  const top = hslToHex(h, satAdj, 0.4);
  const bottom = hslToHex(h, satAdj, 0.2);
  return [top, bottom];
}
function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}
function hslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
function wrapLines(ctx, str, maxW) {
  const words = String(str || "").split(" ");
  let line = "", lines = [];
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
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
