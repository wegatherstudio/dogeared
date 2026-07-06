/* ================================================================
   DOGEARED — icons.js
   Minimal single-color line icons (currentColor). No emoji.
   Session-mood emojis are intentionally NOT here — those stay as-is.
================================================================ */
"use strict";

const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7.2"/><line x1="21" y1="21" x2="16" y2="16"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  sun: '<circle cx="12" cy="12" r="4.6"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  flame: '<path d="M12 2s-1.5 3.5-4 6c-1.7 1.7-2.5 3.3-2.5 5.2A6.5 6.5 0 0 0 12 20a6.5 6.5 0 0 0 6.5-6.8c0-1.4-.5-2.6-1.3-3.6-.4 1.6-1.3 2.4-1.9 2.4.6-2.7-.8-5.4-3.3-8z"/>',
  sparkle: '<path d="M12 2.5l1.7 5.5 5.5 1.7-5.5 1.7L12 17l-1.7-5.6-5.5-1.7 5.5-1.7z"/>',
  star: '<polygon points="12 2.5 14.7 8.6 21 9.3 16.3 13.6 17.5 20 12 16.8 6.5 20 7.7 13.6 3 9.3 9.3 8.6"/>',
  x_circle: '<circle cx="12" cy="12" r="9.2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  camera: '<path d="M22 18.5a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 18.5V8.2A1.6 1.6 0 0 1 3.6 6.6h3.1L8.3 4h7.4l1.6 2.6h3.1A1.6 1.6 0 0 1 22 8.2z"/><circle cx="12" cy="13" r="3.6"/>',
  download: '<path d="M20 15v3.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V15"/><polyline points="7.5 10.5 12 15 16.5 10.5"/><line x1="12" y1="15" x2="12" y2="3.5"/>',
  share: '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><line x1="8.3" y1="13.3" x2="15.7" y2="17"/><line x1="15.7" y1="7" x2="8.3" y2="10.7"/>',
  chev_l: '<polyline points="15 18 9 12 15 6"/>',
  chev_r: '<polyline points="9 18 15 12 9 6"/>',
  book: '<path d="M4.5 19A2.3 2.3 0 0 1 6.8 16.7H19V2.5H6.8A2.3 2.3 0 0 0 4.5 4.8z"/><path d="M4.5 19V4.8"/><path d="M19 16.7v4.8H6.8A2.3 2.3 0 0 1 4.5 19"/>',
  book_open: '<path d="M2.5 4h5.2a3.5 3.5 0 0 1 3.5 3.5v13a2.6 2.6 0 0 0-2.6-2.6H2.5z"/><path d="M21.5 4h-5.2A3.5 3.5 0 0 0 12.8 7.5v13a2.6 2.6 0 0 1 2.6-2.6h6.1z"/>',
  bookmark: '<path d="M18 21l-6-4.4L6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5z"/>',
  layers: '<polygon points="12 2.5 2.5 7.5 12 12.5 21.5 7.5"/><polyline points="2.5 16.2 12 21.2 21.5 16.2"/><polyline points="2.5 11.85 12 16.85 21.5 11.85"/>',
  archive: '<polyline points="21 8.2 21 20.5 3 20.5 3 8.2"/><rect x="1.5" y="3" width="21" height="5.2" rx="1"/><line x1="10.2" y1="12.7" x2="13.8" y2="12.7"/>',
  compass: '<circle cx="12" cy="12" r="9.3"/><polygon points="15.8 8.2 13.9 13.9 8.2 15.8 10.1 10.1"/>',
  feather: '<path d="M20 4c-4.8 0-9.4 2-11.7 4.3C5.7 10.7 5 14.5 5 19h4.5c4.5 0 8.3-.7 10.7-3.3C22.5 13.4 22 8 20 4z"/><line x1="15.5" y1="8.5" x2="5" y2="19"/><line x1="15" y1="14" x2="9.7" y2="14"/>',
  pen: '<path d="M17 3.2a2.7 2.7 0 0 1 3.8 3.8L8.5 19.3 3 20.7l1.4-5.5z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4s1.3-1 4.3-1 4.7 2 7.7 2 3-1 3-1v10s-1 1-3 1-4.7-2-7.7-2-4.3 1-4.3 1z"/>',
  award: '<circle cx="12" cy="8.3" r="6.3"/><polyline points="8.1 13.7 6.7 21.5 12 18.8 17.3 21.5 15.9 13.7"/>',
  zap: '<polygon points="13 2 3.5 13.5 11 13.5 10 22 20.5 10 13.5 10"/>',
  sunrise: '<path d="M16.8 17.5a4.8 4.8 0 0 0-9.6 0"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="4.9" y1="10.3" x2="6.1" y2="11.5"/><line x1="1.5" y1="17.5" x2="3.5" y2="17.5"/><line x1="20.5" y1="17.5" x2="22.5" y2="17.5"/><line x1="17.9" y1="11.5" x2="19.1" y2="10.3"/><line x1="22" y1="21" x2="2" y2="21"/><polyline points="8.5 6.5 12 3 15.5 6.5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="3" y1="10" x2="21" y2="10"/>',
  rocket: '<path d="M4.7 16.2c-1.5 1.3-1.9 4.9-1.9 4.9s3.6-.4 4.9-1.9c.7-.8.7-2.1-.1-2.9a2.1 2.1 0 0 0-2.9-.1z"/><path d="M11.7 14.7l-2.9-2.9a21 21 0 0 1 2-3.9A12.6 12.6 0 0 1 21.5 2.5c0 2.6-.8 7.3-5.9 10.7a21.6 21.6 0 0 1-3.9 1.5z"/><path d="M8.8 11.7H4s.5-2.9 2-3.9c1.6-1 4.8 0 4.8 0"/><path d="M11.7 14.7v4.8s2.9-.5 3.9-2c1-1.6 0-4.8 0-4.8"/>',
  lightbulb: '<path d="M9 18.5h6"/><path d="M10 22h4"/><path d="M12 2.5a7 7 0 0 0-4 12.7v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a7 7 0 0 0-4-12.7z"/>',
  sprout: '<path d="M11 20.5A7 7 0 0 1 9.8 6.6c5.7-1.1 7.2-1.6 9.2-4.1 1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21.5c0-3 1.9-5.4 5.1-6 2.4-.5 3.9-2 3.9-4"/>',
  landmark: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 21 8 3 8"/>',
  coffee: '<path d="M18.5 8.5h1.2a3.8 3.8 0 0 1 0 7.6h-1.2"/><path d="M2.5 8.5h16v8.2a3.8 3.8 0 0 1-3.8 3.8h-8.4a3.8 3.8 0 0 1-3.8-3.8z"/><line x1="6.3" y1="2" x2="6.3" y2="4.6"/><line x1="10" y1="2" x2="10" y2="4.6"/><line x1="13.7" y1="2" x2="13.7" y2="4.6"/>',
  shuffle: '<polyline points="16.5 3 21 3 21 7.5"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16.5 21 21 16.5 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  wind: '<path d="M9.6 4.6a2 2 0 1 1 1.4 3.4H2M12.6 19.9a2 2 0 1 0 1.4-3.4H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/>',
  mountain: '<path d="M8 3.5l4.5 8.5 4-4 5.5 13H2.5z"/>',
  eye: '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
  trending_up: '<polyline points="23 6.5 13.8 15.7 8.5 10.4 1 17.9"/><polyline points="17 6.5 23 6.5 23 12.5"/>',
  hand: '<path d="M8 12.5V5.2a1.6 1.6 0 1 1 3.2 0v5.8"/><path d="M11.2 10.8V3.8a1.6 1.6 0 1 1 3.2 0v7"/><path d="M14.4 11V5.4a1.6 1.6 0 1 1 3.2 0v9.1"/><path d="M17.6 13V9.2a1.6 1.6 0 1 1 3.2 0v6.8c0 4-2.6 6.9-6.6 6.9h-1.6c-2.6 0-4-.8-5.6-2.7l-3.4-4.4a1.7 1.7 0 0 1 2.5-2.3l1.9 1.7"/>',
  footprints: '<path d="M4.5 16.3c1.2-.3 2.2-1.2 2.4-2.5.3-1.5-.6-2.3-1.5-3.6C4.5 8.6 4.2 6 5.6 4.5A2.6 2.6 0 0 1 9.9 6c.3 1.8-.4 2.6-1 4-.5 1.3-.3 2.6.7 3.4"/><path d="M15.5 21.3c1.2-.3 2.2-1.2 2.4-2.5.3-1.5-.6-2.3-1.5-3.6-.9-1.6-1.2-4.2.2-5.7a2.6 2.6 0 0 1 4.3 1.5c.3 1.8-.4 2.6-1 4-.5 1.3-.3 2.6.7 3.4"/>',
  refresh: '<polyline points="17.5 2.5 17.5 8.5 11.5 8.5"/><polyline points="2.5 21.5 2.5 15.5 8.5 15.5"/><path d="M4.3 9a8 8 0 0 1 13.3-3.4l3.4 3.4M2.5 15.5 5.9 19a8 8 0 0 0 13.3-3.4"/>',
};

/**
 * icon(name, {size, cls, filled, weight})
 * Returns an inline <svg> string using currentColor.
 */
function icon(name, opts = {}) {
  const size = opts.size || 20;
  const filled = !!opts.filled;
  const w = opts.weight || 1.7;
  const d = ICON_PATHS[name] || ICON_PATHS.sparkle;
  const cls = opts.cls ? ` ${opts.cls}` : "";
  if (filled) {
    return `<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="${w * 0.5}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }
  return `<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
