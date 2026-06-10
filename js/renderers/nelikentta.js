// renderers/nelikentta.js -- analyyttinen nelikenttä (2×2): tapaukset kahdella akselilla.
// Käyttö: content.view = "nelikentta".
// content: { body?, x:{label,low,high}, y:{label,low,high}, quadrants:{tl,tr,bl,br},
//            points:[{label, x:0..1, y:0..1, note?}], note?, source? }

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-nelikentta", `
    .appx .nk-wrap { position: relative; width: 100%; max-width: 640px; margin: 4px auto 0; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .nk-svg { width: 100%; height: auto; display: block; touch-action: manipulation; }
    .appx .nk-detail { position: absolute; left: 12px; right: 12px; bottom: 12px; background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; padding: 10px 13px; transition: opacity .2s; }
    .appx .nk-detail .nd-title { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 17px; color: var(--fg, #1f1b15); margin-bottom: 3px; }
    .appx .nk-detail .nd-text { font-size: 13px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx .nk-detail.dim .nd-text { color: var(--muted-2, #8a8276); }
    .appx .nk-pt { cursor: pointer; }
  `);
}

function qColor(x, y) {
  if (x >= 0.5 && y >= 0.5) return "#4a7a3c";   // tr -- tavoite
  if (x >= 0.5 && y < 0.5) return "#9a6a3c";    // br
  if (x < 0.5 && y >= 0.5) return "#3a6ea5";    // tl
  return "#a3503a";                              // bl
}

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const X = content.x || {}, Y = content.y || {}, Q = content.quadrants || {};
  const pts = (Array.isArray(content.points) ? content.points : []).map((p, i) => ({
    label: p.label || ("#" + i), x: Math.max(0, Math.min(1, Number(p.x) || 0)), y: Math.max(0, Math.min(1, Number(p.y) || 0)), note: p.note || "",
  }));
  if (!pts.length) { el.innerHTML = util.lead(content) + util.note(content) + util.source(content); return; }

  const css = getComputedStyle(document.documentElement);
  const col = (n, fb) => (css.getPropertyValue(n).trim() || fb);

  const W = 620, H = 560, PADL = 60, PADR = 18, PADT = 18, PADB = 56;
  const sx = (x) => PADL + x * (W - PADL - PADR);
  const sy = (y) => (H - PADB) - y * (H - PADT - PADB);
  const cx = sx(0.5), cy = sy(0.5);
  const x0 = PADL, x1 = W - PADR, y0 = PADT, y1 = H - PADB;

  function corner(text, qx, qy, anchor) {
    if (!text) return "";
    const parts = String(text).split(" -- ");
    const t1 = esc(parts[0]); const t2 = parts[1] ? esc(parts[1]) : "";
    return `<text x="${qx}" y="${qy}" text-anchor="${anchor}" fill="${col("--muted", "#6b6356")}" font-family="${col("--sans", "Work Sans,sans-serif")}" font-size="11.5" font-weight="500">${t1}${t2 ? `<tspan x="${qx}" dy="14" fill="${col("--muted-2", "#8a8276")}" font-weight="400">${t2}</tspan>` : ""}</text>`;
  }

  const arrow = `<defs><marker id="nk-ar" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5" fill="${col("--line-strong", "#c9bfa9")}"/></marker></defs>`;

  let svg = arrow;
  // kvadranttisävyt
  svg += `<rect x="${cx}" y="${y0}" width="${x1 - cx}" height="${cy - y0}" fill="rgba(74,122,60,0.09)"/>`;   // tr
  svg += `<rect x="${x0}" y="${y0}" width="${cx - x0}" height="${cy - y0}" fill="rgba(58,110,165,0.05)"/>`;   // tl
  svg += `<rect x="${cx}" y="${cy}" width="${x1 - cx}" height="${y1 - cy}" fill="rgba(154,106,60,0.05)"/>`;   // br
  svg += `<rect x="${x0}" y="${cy}" width="${cx - x0}" height="${y1 - cy}" fill="rgba(163,80,58,0.06)"/>`;    // bl
  // kehys + keskiristi
  svg += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${col("--line", "#e6dfd0")}" stroke-width="1"/>`;
  svg += `<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}" stroke="${col("--line", "#e6dfd0")}" stroke-dasharray="3 4"/>`;
  svg += `<line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" stroke="${col("--line", "#e6dfd0")}" stroke-dasharray="3 4"/>`;
  // kvadranttiotsikot
  svg += corner(Q.tr, x1 - 10, y0 + 16, "end");
  svg += corner(Q.tl, x0 + 10, y0 + 16, "start");
  svg += corner(Q.br, x1 - 10, y1 - 22, "end");
  svg += corner(Q.bl, x0 + 10, y1 - 22, "start");
  // akselit (nuolet)
  svg += `<line x1="${x0}" y1="${y1}" x2="${x1 + 2}" y2="${y1}" stroke="${col("--line-strong", "#c9bfa9")}" marker-end="url(#nk-ar)"/>`;
  svg += `<line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y0 - 2}" stroke="${col("--line-strong", "#c9bfa9")}" marker-end="url(#nk-ar)"/>`;
  const cMut = col("--muted-2", "#8a8276"), cFg = col("--fg-soft", "#3a332a"), sans = col("--sans", "Work Sans,sans-serif"), serif = col("--serif", "Instrument Serif,serif");
  // x low/high/label
  if (X.low) svg += `<text x="${x0}" y="${y1 + 17}" fill="${cMut}" font-family="${sans}" font-size="10">${esc(X.low)}</text>`;
  if (X.high) svg += `<text x="${x1}" y="${y1 + 17}" text-anchor="end" fill="${cMut}" font-family="${sans}" font-size="10">${esc(X.high)}</text>`;
  if (X.label) svg += `<text x="${(x0 + x1) / 2}" y="${y1 + 38}" text-anchor="middle" fill="${cFg}" font-family="${serif}" font-size="15">${esc(X.label)}</text>`;
  // y low/high/label
  if (Y.low) svg += `<text x="${x0 - 8}" y="${y1 - 2}" text-anchor="end" fill="${cMut}" font-family="${sans}" font-size="10">${esc(Y.low)}</text>`;
  if (Y.high) svg += `<text x="${x0 - 8}" y="${y0 + 10}" text-anchor="end" fill="${cMut}" font-family="${sans}" font-size="10">${esc(Y.high)}</text>`;
  if (Y.label) svg += `<text transform="translate(16,${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" fill="${cFg}" font-family="${serif}" font-size="15">${esc(Y.label)}</text>`;
  // pisteet
  pts.forEach((p, i) => {
    const px = sx(p.x), py = sy(p.y), c = qColor(p.x, p.y);
    const below = p.y > 0.12;
    const ly = below ? py + 19 : py - 12;
    svg += `<g class="nk-pt" data-i="${i}"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7" fill="${c}" stroke="${col("--card", "#fff")}" stroke-width="2"/>`;
    svg += `<text x="${px.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="${sans}" font-size="11" font-weight="500" fill="${cFg}" paint-order="stroke" stroke="${col("--card", "#fff")}" stroke-width="3" stroke-linejoin="round">${esc(p.label)}</text></g>`;
  });

  el.innerHTML = util.lead(content) +
    `<div class="nk-wrap"><svg class="nk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Nelikenttä"></svg>
      <div class="nk-detail dim"><div class="nd-text">Osoita tai klikkaa pistettä lukeaksesi.</div></div></div>` +
    util.note(content) + util.source(content);

  const wrap = el.querySelector(".nk-wrap");
  wrap.querySelector(".nk-svg").innerHTML = svg;
  const detail = wrap.querySelector(".nk-detail");
  const svgEl = wrap.querySelector(".nk-svg");
  let pinned = null;
  function show(i) { const p = pts[i]; detail.className = "nk-detail"; detail.innerHTML = `<div class="nd-title">${esc(p.label)}</div>${p.note ? `<div class="nd-text">${esc(p.note)}</div>` : ""}`; }
  function clear() { detail.className = "nk-detail dim"; detail.innerHTML = `<div class="nd-text">Osoita tai klikkaa pistettä lukeaksesi.</div>`; }
  svgEl.addEventListener("mouseover", (e) => { const g = e.target.closest(".nk-pt"); if (g && pinned === null) show(+g.dataset.i); });
  svgEl.addEventListener("mouseout", (e) => { const g = e.target.closest(".nk-pt"); if (g && pinned === null) clear(); });
  svgEl.addEventListener("click", (e) => { const g = e.target.closest(".nk-pt"); if (!g) { pinned = null; clear(); return; } const i = +g.dataset.i; if (pinned === i) { pinned = null; clear(); } else { pinned = i; show(i); } });
}