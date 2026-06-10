// renderers/virtauskartta.js -- virtauskartta (Sankey): painotetut virrat sarakkeiden välillä.
// Käyttö: content.view = "virtauskartta".
// content: { body?, nodes:[{id, label, col, color?}], links:[{from, to, value, note?}], note?, source? }
// Leveys = arvo. Solmujen pystyjärjestys seuraa nodes-listan järjestystä sarakkeen sisällä.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-virtaus", `
    .appx .vk-wrap { position: relative; width: 100%; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .vk-svg { width: 100%; height: auto; display: block; touch-action: manipulation; }
    .appx .vk-ribbon { transition: fill-opacity .15s; cursor: pointer; }
    .appx .vk-ribbon.dim { fill-opacity: 0.12 !important; }
    .appx .vk-node text { pointer-events: none; }
    .appx .vk-detail { position: absolute; left: 12px; right: 12px; bottom: 12px; background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; padding: 10px 13px; transition: opacity .2s; }
    .appx .vk-detail .vd-title { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 16px; color: var(--fg, #1f1b15); margin-bottom: 3px; }
    .appx .vk-detail .vd-text { font-size: 13px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx .vk-detail.dim .vd-text { color: var(--muted-2, #8a8276); }
  `);
}

function rgba(hex, a) { const h = hex.replace("#", ""); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const raw = Array.isArray(content.nodes) ? content.nodes : [];
  if (!raw.length) { el.innerHTML = util.lead(content) + util.note(content) + util.source(content); return; }
  const N = {};
  raw.forEach((n, i) => { N[n.id] = { id: n.id, label: n.label || n.id, col: Number(n.col) || 0, color: n.color || "#6b6356", ord: i, out: [], in: [], vOut: 0, vIn: 0 }; });
  const links = (Array.isArray(content.links) ? content.links : [])
    .map((l, i) => ({ i, from: l.from, to: l.to, value: Math.max(0, Number(l.value) || 0), note: l.note || "" }))
    .filter((l) => N[l.from] && N[l.to] && l.value > 0);
  links.forEach((l) => { l.color = N[l.from].color; N[l.from].out.push(l); N[l.to].in.push(l); N[l.from].vOut += l.value; N[l.to].vIn += l.value; });
  const list = Object.values(N);
  list.forEach((n) => n.value = Math.max(n.vIn, n.vOut, 0.0001));
  const maxCol = Math.max(...list.map((n) => n.col));

  const W = 700, padL = 14, padR = 14, padT = 18, NWb = 16, PH = 440, gap = 18, detailH = 84;
  const H = padT + PH + detailH;
  const colX = (c) => maxCol === 0 ? padL : padL + c * ((W - padL - padR - NWb) / maxCol);

  const cols = {}; list.forEach((n) => { (cols[n.col] = cols[n.col] || []).push(n); });
  // mitoituskerroin tiukimmasta sarakkeesta
  let k = Infinity;
  Object.values(cols).forEach((arr) => { const tot = arr.reduce((s, n) => s + n.value, 0); const avail = PH - (arr.length - 1) * gap; const kk = avail / (tot || 1); if (kk < k) k = kk; });
  // y-sijoittelu sarakkeittain (nodes-listan järjestyksessä)
  Object.keys(cols).forEach((c) => {
    const arr = cols[c].slice().sort((a, b) => a.ord - b.ord);
    const used = arr.reduce((s, n) => s + n.value * k, 0) + (arr.length - 1) * gap;
    let y = padT + (PH - used) / 2;
    arr.forEach((n) => { n.h = Math.max(2, n.value * k); n.x = colX(n.col); n.y = y; y += n.h + gap; });
  });
  // linkkien kaistat solmujen sisällä
  list.forEach((n) => {
    let o = 0; n.out.slice().sort((a, b) => N[a.to].y - N[b.to].y).forEach((l) => { l.sy0 = n.y + o; o += l.value * k; l.sy1 = n.y + o; });
    let ii = 0; n.in.slice().sort((a, b) => N[a.from].y - N[b.from].y).forEach((l) => { l.ty0 = n.y + ii; ii += l.value * k; l.ty1 = n.y + ii; });
  });

  const css = getComputedStyle(document.documentElement);
  const col = (n, fb) => (css.getPropertyValue(n).trim() || fb);
  const cFg = col("--fg-soft", "#3a332a"), cCard = col("--card", "#fff"), sans = col("--sans", "Work Sans,sans-serif");

  let s = "";
  // ribbonit
  links.forEach((l) => {
    const sN = N[l.from], tN = N[l.to];
    const sx = sN.x + NWb, tx = tN.x, mx = (sx + tx) / 2;
    s += `<path class="vk-ribbon" data-i="${l.i}" d="M${sx},${l.sy0} C${mx},${l.sy0} ${mx},${l.ty0} ${tx},${l.ty0} L${tx},${l.ty1} C${mx},${l.ty1} ${mx},${l.sy1} ${sx},${l.sy1} Z" fill="${rgba(l.color, 0.34)}"/>`;
  });
  // solmut + nimet
  list.forEach((n) => {
    s += `<g class="vk-node"><rect x="${n.x}" y="${n.y.toFixed(1)}" width="${NWb}" height="${n.h.toFixed(1)}" rx="2" fill="${n.color}"/>`;
    const my = n.y + n.h / 2 + 4;
    const right = n.col < maxCol;
    const lx = right ? n.x + NWb + 6 : n.x - 6;
    s += `<text x="${lx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="${right ? "start" : "end"}" font-family="${sans}" font-size="11.5" font-weight="500" fill="${cFg}" paint-order="stroke" stroke="${cCard}" stroke-width="3.5" stroke-linejoin="round">${esc(n.label)}</text></g>`;
  });

  el.innerHTML = util.lead(content) +
    `<div class="vk-wrap"><svg class="vk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Virtauskartta"></svg>
      <div class="vk-detail dim"><div class="vd-text">Osoita tai klikkaa virtaa lukeaksesi.</div></div></div>` +
    util.note(content) + util.source(content);

  const wrap = el.querySelector(".vk-wrap");
  const svgEl = wrap.querySelector(".vk-svg");
  svgEl.innerHTML = s;
  const detail = wrap.querySelector(".vk-detail");
  const ribbons = Array.from(svgEl.querySelectorAll(".vk-ribbon"));
  let pinned = null;
  const linkById = (i) => links.find((l) => l.i === i);
  function show(i) {
    const l = linkById(i); if (!l) return;
    ribbons.forEach((r) => r.classList.toggle("dim", +r.dataset.i !== i));
    detail.className = "vk-detail";
    detail.innerHTML = `<div class="vd-title">${esc(N[l.from].label)} → ${esc(N[l.to].label)}</div>${l.note ? `<div class="vd-text">${esc(l.note)}</div>` : ""}`;
  }
  function clear() { ribbons.forEach((r) => r.classList.remove("dim")); detail.className = "vk-detail dim"; detail.innerHTML = `<div class="vd-text">Osoita tai klikkaa virtaa lukeaksesi.</div>`; }
  svgEl.addEventListener("mouseover", (e) => { const r = e.target.closest(".vk-ribbon"); if (r && pinned === null) show(+r.dataset.i); });
  svgEl.addEventListener("mouseout", (e) => { const r = e.target.closest(".vk-ribbon"); if (r && pinned === null) clear(); });
  svgEl.addEventListener("click", (e) => { const r = e.target.closest(".vk-ribbon"); if (!r) { pinned = null; clear(); return; } const i = +r.dataset.i; if (pinned === i) { pinned = null; clear(); } else { pinned = i; show(i); } });
}