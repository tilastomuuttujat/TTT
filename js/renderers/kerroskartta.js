// renderers/kerroskartta.js -- konsentrinen kerroskartta inline-liitteeksi.
// Käyttö: content.view = "kerroskartta".
// content: { body?, intro?, layers:[string|{name}], nodes:[{layer:int, label, short?, text}], note?, source? }
// Kehät ovat JÄRJESTETTYJÄ kerroksia (layer 0 = ydin). Säde kantaa merkitystä. Klikkaa solmua → selite laatikossa.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-kerros", `
    .appx .ker-wrap { position: relative; width: 100%; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .ker-svg { width: 100%; height: auto; display: block; }
    .appx .ker-ring { fill: none; stroke: var(--line, #e6dfd0); stroke-width: 1; }
    .appx .ker-ring-label { fill: var(--muted-2, #8a8276); font-family: var(--mono, ui-monospace, monospace); font-size: 9.5px; text-anchor: middle; letter-spacing: .04em; text-transform: uppercase; }
    .appx .ker-node circle { cursor: pointer; transition: opacity .15s, r .15s; }
    .appx .ker-node text { font-family: var(--sans, "Work Sans", sans-serif); pointer-events: none; }
    .appx .ker-dim { opacity: 0.22 !important; }
    .appx .ker-detail { position: absolute; left: 14px; right: 14px; bottom: 14px; background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; padding: 12px 14px; transition: opacity .2s; }
    .appx .ker-detail .kd-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
    .appx .ker-detail .kd-title { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 19px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 4px; }
    .appx .ker-detail .kd-text { font-size: 13.5px; line-height: 1.6; color: var(--muted, #6b6356); }
  `);
}

const RAMP = ["#a3503a", "#9a6a3c", "#8a7a2a", "#4a7a3c", "#3a6ea5", "#7a5ea8", "#b06a8a"];

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const layers = (Array.isArray(content.layers) ? content.layers : []).map((l, i) => ({ name: (typeof l === "string" ? l : (l && l.name)) || ("Kerros " + (i + 1)), i }));
  const allNodes = (Array.isArray(content.nodes) ? content.nodes : []).map((node, i) => ({
    layer: Math.max(0, Math.min(layers.length - 1, Number(node.layer) || 0)),
    label: node.label || ("#" + i),
    short: node.short || node.label || ("#" + i),
    text: node.text || node.desc || "",
  }));
  const L = layers.length;
  if (!L || !allNodes.length) { el.innerHTML = util.lead(content) + util.note(content) + util.source(content); return; }

  // geometria
  const W = 760, innerR = 58, outerR = 282;
  const ringR = (i) => L === 1 ? innerR : innerR + (outerR - innerR) * (i / (L - 1));
  const topPad = 30, bottomPad = 30;
  const cy = topPad + outerR;
  const cx = W / 2;
  const H = cy + outerR + bottomPad;
  const layerColor = (i) => RAMP[i % RAMP.length];

  const intro = content.intro || "Klikkaa käsitettä lukeaksesi. Kerrokset etenevät ytimestä ulospäin.";

  el.innerHTML = util.lead(content) +
    `<div class="ker-wrap"><svg class="ker-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kerroskartta"></svg>
      <div class="ker-detail"><div class="kd-text" data-default>${esc(intro)}</div></div></div>` +
    util.note(content) + util.source(content);

  const wrap = el.querySelector(".ker-wrap");
  const svg = wrap.querySelector(".ker-svg");
  const detail = wrap.querySelector(".ker-detail");
  const css = getComputedStyle(document.documentElement);
  const col = (nm, fb) => (css.getPropertyValue(nm).trim() || fb);

  // sijoita solmut kehille (tasaisesti, kerroskohtaisella vaihesiirrolla)
  const byLayer = {};
  allNodes.forEach((nd) => { (byLayer[nd.layer] = byLayer[nd.layer] || []).push(nd); });
  Object.keys(byLayer).forEach((li) => {
    const arr = byLayer[li]; const r = ringR(+li); const phase = -Math.PI / 2 + (+li) * 0.5;
    arr.forEach((nd, k) => {
      const ang = phase + (k / arr.length) * Math.PI * 2;
      nd.x = cx + Math.cos(ang) * r;
      nd.y = cy + Math.sin(ang) * r;
      nd.color = layerColor(+li);
    });
  });

  function buildSvg() {
    const cLine = col("--line", "#e6dfd0"), cCard = col("--card", "#fff"), cFg = col("--fg-soft", "#3a332a");
    let s = "";
    // kehät ulkoa sisään + kerrosnimet
    for (let i = L - 1; i >= 0; i--) {
      const r = ringR(i);
      s += `<circle class="ker-ring" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}"/>`;
      s += `<text class="ker-ring-label" x="${cx}" y="${(cy - r - 7).toFixed(1)}">${esc(layers[i].name)}</text>`;
    }
    // keskuspiste
    s += `<circle cx="${cx}" cy="${cy}" r="3" fill="${col("--muted-2", "#8a8276")}"/>`;
    // solmut
    allNodes.forEach((nd, idx) => {
      s += `<g class="ker-node" data-i="${idx}">`;
      s += `<circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="9" fill="${nd.color}" fill-opacity="0.85" stroke="${cCard}" stroke-width="2"/>`;
      s += `<text x="${nd.x.toFixed(1)}" y="${(nd.y + 21).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${cFg}" paint-order="stroke" stroke="${cCard}" stroke-width="3" stroke-linejoin="round">${esc(nd.short)}</text>`;
      s += `</g>`;
    });
    svg.innerHTML = s;
  }
  buildSvg();

  const nodeGroups = () => Array.from(svg.querySelectorAll(".ker-node"));
  let pinned = null;
  function setActive(idx) {
    nodeGroups().forEach((g) => {
      const i = +g.getAttribute("data-i");
      g.classList.toggle("ker-dim", idx !== null && i !== idx);
      const c = g.querySelector("circle"); if (c) c.setAttribute("r", i === idx ? "12" : "9");
    });
  }
  function showDetail(nd) {
    detail.innerHTML = `<div class="kd-tag" style="color:${nd.color}">${esc(layers[nd.layer].name)}</div><div class="kd-title">${esc(nd.label)}</div>${nd.text ? `<div class="kd-text">${esc(nd.text)}</div>` : ""}`;
  }
  function reset() { pinned = null; setActive(null); detail.innerHTML = `<div class="kd-text" data-default>${esc(intro)}</div>`; }

  svg.addEventListener("click", (e) => {
    const g = e.target.closest(".ker-node");
    if (!g) { reset(); return; }
    const idx = +g.getAttribute("data-i");
    if (pinned === idx) { reset(); return; }
    pinned = idx; setActive(idx); showDetail(allNodes[idx]);
  });
  svg.addEventListener("mouseover", (e) => { const g = e.target.closest(".ker-node"); if (g && pinned === null) showDetail(allNodes[+g.getAttribute("data-i")]); });
  svg.addEventListener("mouseout", (e) => { const g = e.target.closest(".ker-node"); if (g && pinned === null) detail.innerHTML = `<div class="kd-text" data-default>${esc(intro)}</div>`; });
}