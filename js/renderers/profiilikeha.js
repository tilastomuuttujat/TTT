// renderers/profiilikeha.js -- vertaileva profiilikehä (radar): muutama sarja monella akselilla.
// Käyttö: content.view = "profiilikeha".
// content: { body?, axes:[{key,label}], series:[{label, place?, color, values:{key:0..max}}], max?, note?, source? }

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-profiili", `
    .appx .pk-wrap { width: 100%; max-width: 600px; margin: 4px auto 0; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); padding: 6px 6px 12px; }
    .appx .pk-svg { width: 100%; height: auto; display: block; }
    .appx .pk-poly { transition: fill-opacity .15s, stroke-opacity .15s; }
    .appx .pk-dot { transition: opacity .15s; }
    .appx .pk-dim { fill-opacity: 0.03 !important; stroke-opacity: 0.16 !important; }
    .appx .pk-dim-dot { opacity: 0.16 !important; }
    .appx .pk-legend { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 6px 8px 0; }
    .appx .pk-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 11px; border: 1px solid var(--line, #e6dfd0); border-radius: 20px; background: var(--bg-soft, #f4efe5); color: var(--fg-soft, #3a332a); cursor: pointer; transition: .15s; }
    .appx .pk-chip:hover { border-color: var(--line-strong, #c9bfa9); }
    .appx .pk-chip.on { border-color: currentColor; background: var(--card, #fff); }
    .appx .pk-cdot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .appx .pk-chip .pk-place { color: var(--muted-2, #8a8276); font-size: 11px; }
    .appx .pk-readout { text-align: center; font-size: 12.5px; color: var(--muted, #6b6356); margin: 10px 10px 0; min-height: 20px; line-height: 1.5; }
  `);
}

function rgba(hex, a) { const h = hex.replace("#", ""); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;
  const axes = Array.isArray(c.axes) ? c.axes : [];
  const series = Array.isArray(c.series) ? c.series.map((s, i) => ({ label: s.label || ("#" + i), place: s.place || "", color: s.color || "#6b6356", values: s.values || {} })) : [];
  if (axes.length < 3 || !series.length) { el.innerHTML = util.lead(c) + util.note(c) + util.source(c); return; }
  const max = Number(c.max) || 100, N = axes.length;

  const W = 600, cx = 300, cy = 220, R = 180;
  const ang = (i) => (-90 + i * 360 / N) * Math.PI / 180;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const css = getComputedStyle(document.documentElement);
  const col = (n, fb) => (css.getPropertyValue(n).trim() || fb);
  const cLine = col("--line", "#e6dfd0"), cLineS = col("--line-strong", "#c9bfa9"), cMut = col("--muted-2", "#8a8276"), cFg = col("--fg-soft", "#3a332a"), sans = col("--sans", "Work Sans,sans-serif");
  const poly = (r) => axes.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");

  let s = "";
  // ruudukko
  [0.25, 0.5, 0.75, 1].forEach((lv) => {
    s += `<polygon points="${poly(R * lv)}" fill="none" stroke="${lv === 1 ? cLineS : cLine}" stroke-width="1"/>`;
  });
  axes.forEach((_, i) => { const [x, y] = pt(i, R); s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${cLine}" stroke-width="1"/>`; });
  // tasomerkit ylä-akselilla
  [0.5, 1].forEach((lv) => { const [x, y] = pt(0, R * lv); s += `<text x="${x + 4}" y="${y + 3}" fill="${cMut}" font-family="${sans}" font-size="9">${Math.round(max * lv)}</text>`; });
  // akselien nimet
  axes.forEach((a, i) => {
    const [x, y] = pt(i, R + 20); const cs = Math.cos(ang(i));
    const anchor = Math.abs(cs) < 0.25 ? "middle" : (cs > 0 ? "start" : "end");
    const dy = Math.sin(ang(i)) > 0.5 ? 10 : (Math.sin(ang(i)) < -0.5 ? -2 : 4);
    s += `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" fill="${cFg}" font-family="${sans}" font-size="11.5" font-weight="500">${esc(a.label)}</text>`;
  });
  // sarjat
  series.forEach((se, si) => {
    const pts = axes.map((a, i) => { const v = Math.max(0, Math.min(max, Number(se.values[a.key]) || 0)); return pt(i, R * v / max); });
    s += `<polygon class="pk-poly" data-i="${si}" points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${rgba(se.color, 0.10)}" stroke="${se.color}" stroke-width="2" stroke-linejoin="round"/>`;
    pts.forEach((p) => { s += `<circle class="pk-dot" data-i="${si}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${se.color}"/>`; });
  });

  const legend = `<div class="pk-legend">${series.map((se, i) => `<button class="pk-chip" data-i="${i}" style="color:${se.color}"><span class="pk-cdot" style="background:${se.color}"></span>${esc(se.label)}${se.place ? ` <span class="pk-place">${esc(se.place)}</span>` : ""}</button>`).join("")}</div>`;

  el.innerHTML = util.lead(c) +
    `<div class="pk-wrap"><svg class="pk-svg" viewBox="0 0 ${W} 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Profiilikehä"></svg>${legend}<div class="pk-readout">Klikkaa serkkua korostaaksesi hänen profiilinsa.</div></div>` +
    util.note(c) + util.source(c);

  const wrap = el.querySelector(".pk-wrap");
  wrap.querySelector(".pk-svg").innerHTML = s;
  const readout = wrap.querySelector(".pk-readout");
  let active = null;
  function update() {
    wrap.querySelectorAll(".pk-poly").forEach((p) => p.classList.toggle("pk-dim", active !== null && +p.dataset.i !== active));
    wrap.querySelectorAll(".pk-dot").forEach((p) => p.classList.toggle("pk-dim-dot", active !== null && +p.dataset.i !== active));
    wrap.querySelectorAll(".pk-chip").forEach((ch) => ch.classList.toggle("on", active !== null && +ch.dataset.i === active));
    if (active === null) { readout.textContent = "Klikkaa serkkua korostaaksesi hänen profiilinsa."; return; }
    const se = series[active];
    readout.innerHTML = `<b style="color:${se.color}">${esc(se.label)}${se.place ? " · " + esc(se.place) : ""}</b> -- ` +
      axes.map((a) => `${esc(a.label)} ${Math.round(Number(se.values[a.key]) || 0)}`).join(" · ");
  }
  wrap.querySelectorAll(".pk-chip").forEach((ch) => ch.addEventListener("click", () => { const i = +ch.dataset.i; active = active === i ? null : i; update(); }));
}