// renderers/dashboard.js — pienet SVG-paneelit (viiva/pylväs) + legenda.
let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-dash", `
    .appx .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin: 14px 0; }
    .appx .dash-panel { margin: 0; }
    .appx .dash-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--fg, #1f1b15); }
    .appx .dash-unit { font-weight: 400; color: var(--muted, #6b6356); font-size: 11px; }
    .appx .dash-svg { width: 100%; height: auto; background: var(--bg-soft, #f4efe5); border-radius: 8px; }
    .appx .dash-cat { font-size: 9px; fill: var(--muted, #6b6356); }
    .appx .dash-note { font-size: 11px; color: var(--muted, #6b6356); margin-top: 4px; line-height: 1.4; }
    .appx .dash-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0; font-size: 12px; color: var(--muted, #6b6356); }
    .appx .dash-legend-item { display: inline-flex; align-items: center; gap: 5px; }
    .appx .dash-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    .appx .dash-grid-line { stroke: var(--line, #e6dfd0); stroke-width: .5; }
    .appx .dash-axis-line { stroke: var(--line-strong, #c9bfa9); stroke-width: .6; }
    .appx .dash-ytick { font-size: 7.5px; fill: var(--muted, #6b6356); }
  `);
}

export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  if (!c || typeof c !== "object") { el.innerHTML = ""; return; }
  const panels = Array.isArray(c.panels) ? c.panels : [];
  const RAMP = ["var(--accent)", "var(--muted)", "var(--accent-soft)", "var(--line-strong)"];
  let labels = (Array.isArray(c.legend) && c.legend.length)
    ? c.legend.map((l) => l.label)
    : ((panels[0] && Array.isArray(panels[0].series)) ? panels[0].series.map((s) => s.label) : []);
  labels = labels.filter((v, i) => labels.indexOf(v) === i);
  const colorOf = (label) => { const i = labels.indexOf(label); return RAMP[(i < 0 ? 0 : i) % RAMP.length]; };
  const widthOf = (label) => labels.indexOf(label) === 0 ? 2.3 : 1.5;
  const legendHtml = labels.length
    ? `<div class="dash-legend">${labels.map((l) => `<span class="dash-legend-item"><span class="dash-swatch" style="background:${colorOf(l)}"></span>${esc(l)}</span>`).join("")}</div>`
    : "";
  const fmt = (v) => { const a = Math.abs(v); return a >= 100 ? String(Math.round(v)) : a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2); };
  const W = 232, H = 126, padL = 32, padR = 10, padT = 10, padB = 18;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const panelHtml = panels.map((p) => {
    const xs = Array.isArray(p.x) ? p.x : [];
    const series = Array.isArray(p.series) ? p.series : [];
    const nums = series.flatMap((s) => (Array.isArray(s.values) ? s.values : []).filter((v) => typeof v === "number" && isFinite(v)));
    const isBar = p.type === "bar";
    let mn = nums.length ? Math.min(...nums) : 0;
    let mx = nums.length ? Math.max(...nums) : 1;
    if (isBar) mn = Math.min(0, mn);
    else { const pd = (mx - mn) * 0.12 || Math.abs(mx) * 0.12 || 1; mn -= pd; mx += pd; }
    const span = (mx - mn) || 1;
    const yFor = (v) => padT + plotH * (1 - (v - mn) / span);
    const ticks = [mx, (mn + mx) / 2, mn];
    const axis = `<line class="dash-axis-line" x1="${padL}" y1="${padT}" x2="${padL}" y2="${(padT + plotH).toFixed(1)}"></line>`
      + ticks.map((t) => {
          const y = yFor(t);
          return `<line class="dash-grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"></line>`
            + `<text class="dash-ytick" x="${padL - 5}" y="${(y + 2.8).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`;
        }).join("");
    let inner = "";
    if (isBar) {
      const vals = (series[0] && series[0].values) || [];
      const n = vals.length || 1;
      const slot = plotW / n, bw = Math.min(slot * 0.6, 26), base = yFor(Math.max(0, mn));
      inner = vals.map((v, i) => {
        if (typeof v !== "number" || !isFinite(v)) return "";
        const cx = padL + slot * i + slot / 2;
        const y = yFor(v), top = Math.min(y, base), h = Math.abs(base - y);
        return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" style="fill:${colorOf(xs[i])}"></rect>`
          + `<text class="dash-cat" x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(String(xs[i] ?? ""))}</text>`;
      }).join("");
    } else {
      const n = xs.length || ((series[0] && series[0].values && series[0].values.length) || 1);
      const stepX = n > 1 ? plotW / (n - 1) : 0;
      inner = series.map((s) => {
        const pts = (Array.isArray(s.values) ? s.values : []).map((v, i) => (typeof v === "number" && isFinite(v)) ? `${(padL + stepX * i).toFixed(1)},${yFor(v).toFixed(1)}` : null).filter(Boolean).join(" ");
        return `<polyline fill="none" stroke-width="${widthOf(s.label)}" stroke-linejoin="round" stroke-linecap="round" style="stroke:${colorOf(s.label)}" points="${pts}"></polyline>`;
      }).join("");
      if (xs.length) inner += `<text class="dash-cat" x="${padL}" y="${H - 5}" text-anchor="start">${esc(String(xs[0]))}</text><text class="dash-cat" x="${W - padR}" y="${H - 5}" text-anchor="end">${esc(String(xs[xs.length - 1]))}</text>`;
    }
    const unit = p.unit ? ` <span class="dash-unit">${esc(p.unit)}</span>` : "";
    const note = p.note ? `<div class="dash-note">${esc(p.note)}</div>` : "";
    return `<figure class="dash-panel"><figcaption class="dash-title">${esc(p.title || "")}${unit}</figcaption><svg viewBox="0 0 ${W} ${H}" class="dash-svg" preserveAspectRatio="xMidYMid meet" role="img">${axis}${inner}</svg>${note}</figure>`;
  }).join("");
  el.innerHTML = util.lead(c) + legendHtml + `<div class="dash-grid">${panelHtml}</div>` + util.extras(c) + util.source(c);
}
