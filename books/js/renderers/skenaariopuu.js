// renderers/skenaariopuu.js -- haarautuva skenaariopuu (vaaka, aika vasemmalta oikealle).
// Käyttö: content.view = "skenaariopuu".
// content: { body?, root:{label, kind?, note?, children?[...]}, note?, source? }
// kind: "now" | "path" | "good" | "bad" | (muu = neutraali)

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-skenaario", `
    .appx .sp-wrap { position: relative; width: 100%; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .sp-svg { width: 100%; height: auto; display: block; touch-action: manipulation; }
    .appx .sp-node { cursor: pointer; }
    .appx .sp-node text { pointer-events: none; }
    .appx .sp-detail { position: absolute; left: 12px; right: 12px; bottom: 12px; background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; padding: 10px 13px; transition: opacity .2s; }
    .appx .sp-detail .sd-title { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 17px; color: var(--fg, #1f1b15); margin-bottom: 3px; }
    .appx .sp-detail .sd-text { font-size: 13px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx .sp-detail.dim .sd-text { color: var(--muted-2, #8a8276); }
  `);
}

const KIND = {
  now:  { stroke: "#4a4034", fill: "rgba(31,27,21,0.10)" },
  path: { stroke: "#9a6a3c", fill: "rgba(154,106,60,0.10)" },
  good: { stroke: "#4a7a3c", fill: "rgba(74,122,60,0.12)" },
  bad:  { stroke: "#a3503a", fill: "rgba(163,80,58,0.10)" },
};
const KIND_DEFAULT = { stroke: "#6b6356", fill: "rgba(107,99,86,0.08)" };

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;
  const root = content.root;
  if (!root) { el.innerHTML = util.lead(content) + util.note(content) + util.source(content); return; }

  const flat = []; let leafCount = 0, maxDepth = 0;
  (function walk(n, depth) {
    n._d = depth; if (depth > maxDepth) maxDepth = depth;
    n._i = flat.length; flat.push(n);
    const kids = Array.isArray(n.children) ? n.children : [];
    if (!kids.length) { n._y = leafCount++; }
    else { kids.forEach((k) => walk(k, depth + 1)); n._y = (kids[0]._y + kids[kids.length - 1]._y) / 2; }
  })(root, 0);
  const leaves = Math.max(1, leafCount);

  const NW = 152, NH = 38, colW = 200, rowH = 54, padL = 14, padT = 26, padR = 14, detailH = 86;
  const W = padL + maxDepth * colW + NW + padR;
  const H = padT + leaves * rowH + detailH;
  const nx = (n) => padL + n._d * colW;
  const ny = (n) => padT + (n._y + 0.5) * rowH;

  const css = getComputedStyle(document.documentElement);
  const col = (n, fb) => (css.getPropertyValue(n).trim() || fb);
  const sans = col("--sans", "Work Sans,sans-serif"), serif = col("--serif", "Instrument Serif,serif");
  const cFg = col("--fg-soft", "#3a332a"), cMut = col("--muted-2", "#8a8276");
  const trunc = (s, n = 23) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  let s = "";
  // aikavihje
  s += `<text x="${padL}" y="14" fill="${cMut}" font-family="${sans}" font-size="10">nyt →</text>`;
  s += `<text x="${W - padR}" y="14" text-anchor="end" fill="${cMut}" font-family="${sans}" font-size="10">tulevaisuus</text>`;
  // yhdysviivat
  flat.forEach((n) => {
    const kids = Array.isArray(n.children) ? n.children : [];
    kids.forEach((k) => {
      const x1 = nx(n) + NW, y1 = ny(n), x2 = nx(k), y2 = ny(k), mid = (x1 + x2) / 2;
      s += `<path d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" fill="none" stroke="${col("--line-strong", "#c9bfa9")}" stroke-width="1.4"/>`;
    });
  });
  // solmut
  flat.forEach((n) => {
    const k = KIND[n.kind] || KIND_DEFAULT;
    const x = nx(n), y = ny(n) - NH / 2;
    s += `<g class="sp-node" data-i="${n._i}"><rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="9" fill="${k.fill}" stroke="${k.stroke}" stroke-width="1.4"/>`;
    s += `<text x="${x + NW / 2}" y="${ny(n) + 4}" text-anchor="middle" font-family="${sans}" font-size="11.5" font-weight="500" fill="${cFg}">${esc(trunc(n.label || ""))}</text></g>`;
  });

  el.innerHTML = util.lead(content) +
    `<div class="sp-wrap"><svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Skenaariopuu"></svg>
      <div class="sp-detail dim"><div class="sd-text">Osoita tai klikkaa solmua lukeaksesi skenaarion.</div></div></div>` +
    util.note(content) + util.source(content);

  const wrap = el.querySelector(".sp-wrap");
  const svgEl = wrap.querySelector(".sp-svg");
  svgEl.innerHTML = s;
  const detail = wrap.querySelector(".sp-detail");
  let pinned = null;
  const show = (i) => { const n = flat[i]; detail.className = "sp-detail"; detail.innerHTML = `<div class="sd-title">${esc(n.label || "")}</div>${n.note ? `<div class="sd-text">${esc(n.note)}</div>` : ""}`; };
  const clear = () => { detail.className = "sp-detail dim"; detail.innerHTML = `<div class="sd-text">Osoita tai klikkaa solmua lukeaksesi skenaarion.</div>`; };
  svgEl.addEventListener("mouseover", (e) => { const g = e.target.closest(".sp-node"); if (g && pinned === null) show(+g.dataset.i); });
  svgEl.addEventListener("mouseout", (e) => { const g = e.target.closest(".sp-node"); if (g && pinned === null) clear(); });
  svgEl.addEventListener("click", (e) => { const g = e.target.closest(".sp-node"); if (!g) { pinned = null; clear(); return; } const i = +g.dataset.i; if (pinned === i) { pinned = null; clear(); } else { pinned = i; show(i); } });
}