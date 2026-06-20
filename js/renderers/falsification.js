// renderers/falsification.js -- kolmiportainen falsifiointiliite (A indikaattori / B mekanismi / C vahva testi).
// Sama rajapinta kuin muilla rendereilla: export function render(el, c, opts).
//
// Skeema (content):
// {
//   view: "falsification",
//   body: "...",                 // lead-teksti, valinnainen
//   claim: "\"...\"",            // ennusteen ydinväite
//   tiers: [
//     {
//       tier: "A" | "B" | "C",
//       tier_label: "Indikaattoritesti" | "Mekanismitesti" | "Vahva testi",
//       title: "...",
//       rule: "...",
//       verdict: "...",                 // esim. "Indikaattorituki", "Ei tue eikä kumoa"
//       verdict_status: "pass"|"indicator"|"mechanism"|"partial"|"pending",
//       chart: {
//         kind: "lines" | "bars" | "sparkline-grid" | "missing",
//         // kind:"lines" ---------------------------------------------------
//         series: [{ key, label, color_role, points: [[x,y], ...], unit }],
//         y_label, x_label,
//         threshold: { value, label, axis:"y"|"x" },     // valinnainen vaakaviiva/pystyviiva
//         fit: { from: x, series_key },                   // valinnainen regressiosuora (PNS) yhdelle sarjalle
//         dual_axis: { left:{min,max,unit}, right:{min,max,unit}, right_series:[key,...] }, // valinnainen
//         // kind:"bars" ----------------------------------------------------
//         bars: [{ label, value, tone_role }],
//         corridor: { low, high, label },                 // valinnainen pystykäytävä (esim. ±15%)
//         baseline: 0,
//         // kind:"sparkline-grid" -------------------------------------------
//         panels: [{ label, points:[[x,y],...], color_role, fmt:"pct1"|"num1"|"num2" }],
//         // kind:"missing" ---------------------------------------------------
//         required: ["series.key", ...]
//       },
//       stats: [[label, value, sub, tone_role], ...],     // tone_role: pass|warn|fi|""
//       note: "..."
//     }
//   ],
//   source: "..."
// }

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-falsification", `
    .appx-fls-wrap { margin: 14px 0 0; }
    .appx-fls-claim { border-left: 3px solid var(--accent, #1f1b15); padding: 6px 0 6px 16px; margin: 6px 0 14px;
      font-size: 15px; font-style: italic; color: var(--fg, #1f1b15); }
    .appx-fls-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; border-bottom: 1px solid var(--line, #e6dfd0); padding-bottom: 0; }
    .appx-fls-tab { font-family: "Work Sans", system-ui, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: .03em;
      padding: 9px 13px; border: none; border-bottom: 2.5px solid transparent; background: transparent;
      color: var(--muted, #6b6356); cursor: pointer; display: flex; align-items: center; gap: 7px; margin-bottom: -1px; }
    .appx-fls-tab:hover { color: var(--fg, #1f1b15); }
    .appx-fls-tab[aria-selected="true"] { color: var(--fg, #1f1b15); border-bottom-color: var(--fg, #1f1b15); }
    .appx-fls-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .appx-fls-dot.pass, .appx-fls-dot.ready { background: var(--ok, #2e7d5b); }
    .appx-fls-dot.indicator, .appx-fls-dot.mechanism { background: var(--accent, #1f1b15); }
    .appx-fls-dot.partial, .appx-fls-dot.embedded { background: var(--warn, #c8843b); }
    .appx-fls-dot.pending, .appx-fls-dot.collect { background: var(--bad, #9c4a38); }
    .appx-fls-panel-wrap { animation: appxFlsFade .25s ease; }
    @keyframes appxFlsFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .appx-fls-panel-wrap { animation: none; } }
    .appx-fls-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 7px; flex-wrap: wrap; }
    .appx-fls-title { font-size: 16px; font-weight: 600; max-width: 70%; line-height: 1.3; color: var(--fg, #1f1b15); }
    .appx-fls-badge { font-family: "Work Sans", system-ui, sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; padding: 5px 11px; border-radius: 14px; white-space: nowrap; }
    .appx-fls-badge.pass, .appx-fls-badge.ready { background: rgba(46,125,91,.12); color: #2e7d5b; }
    .appx-fls-badge.indicator, .appx-fls-badge.mechanism { background: rgba(31,27,21,.08); color: var(--accent, #1f1b15); }
    .appx-fls-badge.partial, .appx-fls-badge.embedded { background: rgba(200,132,59,.15); color: #9a6526; }
    .appx-fls-badge.pending, .appx-fls-badge.collect { background: rgba(156,74,56,.10); color: #9c4a38; }
    .appx-fls-rule { font-size: 13.5px; color: var(--muted, #6b6356); margin-bottom: 4px; line-height: 1.55; }
    .appx-fls-rule b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-fls-chart-card { background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 8px;
      padding: 16px 16px 12px; margin: 14px 0; }
    .appx-fls-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-fls-grid { stroke: var(--line, #e6dfd0); stroke-width: 1; }
    .appx-fls-thresh { stroke: var(--warn, #c8843b); stroke-width: 1.6; stroke-dasharray: 6 4; }
    .appx-fls-corridor { fill: rgba(200,132,59,.10); }
    .appx-fls-zero { stroke: var(--muted-2, #8a8276); stroke-width: 1; }
    .appx-fls-axis-label { font-size: 9.5px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-fls-pt { cursor: crosshair; }
    .appx-fls-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .appx-fls-stat { background: var(--card, #fff); border: 1px solid var(--line, #e6dfd0); border-radius: 6px;
      padding: 8px 11px; flex: 1; min-width: 130px; }
    .appx-fls-stat .k { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: var(--muted-2, #8a8276);
      font-family: "Work Sans", system-ui, sans-serif; margin-bottom: 3px; }
    .appx-fls-stat .v { font-size: 17px; font-weight: 700; font-family: "Work Sans", system-ui, sans-serif; color: var(--fg, #1f1b15); }
    .appx-fls-stat .v.pass { color: #2e7d5b; } .appx-fls-stat .v.warn { color: #9a6526; } .appx-fls-stat .v.fi { color: var(--accent, #1f1b15); }
    .appx-fls-stat .sub { font-size: 10.5px; color: var(--muted-2, #8a8276); margin-top: 2px; }
    .appx-fls-reading { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line, #e6dfd0); }
    .appx-fls-reading-item { font-size: 11px; color: var(--muted, #6b6356); display: flex; align-items: center; gap: 6px;
      font-family: "Work Sans", system-ui, sans-serif; }
    .appx-fls-swatch { width: 12px; height: 3px; border-radius: 2px; flex-shrink: 0; }
    .appx-fls-note { border: 1px dashed var(--line, #e6dfd0); border-radius: 6px; padding: 12px 14px; margin-top: 12px;
      font-size: 12.5px; color: var(--muted, #6b6356); line-height: 1.5; }
    .appx-fls-note b { color: var(--fg, #1f1b15); }
    .appx-fls-missing-list { display: grid; gap: 6px; margin-top: 10px; }
    .appx-fls-missing-item { background: var(--card, #fff); border: 1px dashed var(--bad, #9c4a38); border-radius: 5px;
      padding: 7px 10px; font-family: "Work Sans", system-ui, sans-serif; font-size: 11.5px; color: #9c4a38; }
    .appx-fls-tt { position: fixed; pointer-events: none; background: var(--fg, #1f1b15); color: var(--bg, #fdfbf7);
      font-size: 10.5px; padding: 4px 8px; border-radius: 4px; opacity: 0; transition: opacity .1s; white-space: nowrap;
      z-index: 80; transform: translate(-50%,-130%); font-family: "Work Sans", system-ui, sans-serif; }
  `);
}

const TONE_COLOR = { pass: "#2e7d5b", warn: "#c8843b", fi: "var(--accent, #1f1b15)", "": "var(--fg, #1f1b15)" };
const ROLE_COLOR = (role) => ({
  primary: "var(--accent, #1f1b15)", other: "#a9a29a", warn: "#9c4a38",
  pass: "#2e7d5b", b: "#8a5a2a", c: "#6b4f8a"
}[role] || "var(--accent, #1f1b15)");

function el(tag, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function fmtVal(v, fmt) {
  if (fmt === "pct1") return Number(v).toFixed(1) + "%";
  if (fmt === "num2") return Number(v).toFixed(2);
  return Number(v).toFixed(1);
}

// --- kind: lines (aikasarja + valinnainen kynnys/regressio) ---
function drawLines(svg, chart) {
  const W = 520, H = 280, P = { t: 16, r: 16, b: 30, l: 42 };
  const series = chart.series || [];
  const allX = series.flatMap(s => s.points.map(p => p[0]));
  const allY = series.flatMap(s => s.points.map(p => p[1]));
  if (!allX.length) return "<p style='color:var(--muted)'>Ei dataa.</p>";
  const x0 = Math.min(...allX), x1 = Math.max(...allX);
  const yMin = Math.min(...allY), yMax = Math.max(...allY);
  const pad = (yMax - yMin) * 0.1 || 1;
  const y0 = chart.y_min !== undefined ? chart.y_min : yMin - pad;
  const y1 = chart.y_max !== undefined ? chart.y_max : yMax + pad;
  const X = x => P.l + (x - x0) / (x1 - x0 || 1) * (W - P.l - P.r);
  const Y = v => H - P.b - (v - y0) / (y1 - y0 || 1) * (H - P.t - P.b);

  let g = "";
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const v = y0 + (y1 - y0) * i / yTicks;
    g += `<line class="appx-fls-grid" x1="${P.l}" y1="${Y(v)}" x2="${W - P.r}" y2="${Y(v)}"/>`;
    g += `<text class="appx-fls-axis-label" x="${P.l - 6}" y="${Y(v) + 3}" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  const xTickCount = Math.min(5, allX.length);
  const uniqX = [...new Set(allX)].sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(uniqX.length / xTickCount));
  for (let i = 0; i < uniqX.length; i += step) {
    g += `<text class="appx-fls-axis-label" x="${X(uniqX[i])}" y="${H - P.b + 14}" text-anchor="middle">${uniqX[i]}</text>`;
  }

  if (chart.threshold && chart.threshold.axis !== "x") {
    const ty = Y(chart.threshold.value);
    g += `<line class="appx-fls-thresh" x1="${P.l}" y1="${ty}" x2="${W - P.r}" y2="${ty}"/>`;
    g += `<text class="appx-fls-axis-label" x="${W - P.r}" y="${ty - 5}" text-anchor="end" fill="#c8843b">${chart.threshold.label || ""}</text>`;
  } else if (chart.threshold && chart.threshold.axis === "x") {
    const tx = X(chart.threshold.value);
    g += `<line class="appx-fls-thresh" x1="${tx}" y1="${P.t}" x2="${tx}" y2="${H - P.b}"/>`;
    g += `<text class="appx-fls-axis-label" x="${tx + 4}" y="${P.t + 10}" fill="#c8843b">${chart.threshold.label || ""}</text>`;
  }

  let lines = "", dots = "", labels = "";
  series.forEach(s => {
    const color = ROLE_COLOR(s.color_role);
    if (chart.fit && chart.fit.series_key === s.key) {
      const pts = s.points.filter(p => p[0] >= chart.fit.from);
      const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
      const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
      const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
      const xa = chart.fit.from, xb = x1;
      lines += `<line x1="${X(xa)}" y1="${Y(m * xa + b)}" x2="${X(xb)}" y2="${Y(m * xb + b)}" stroke="${color}" stroke-width="1.6" stroke-dasharray="4 3" opacity=".8"/>`;
    }
    const pts = s.points.map(([x, y]) => [X(x), Y(y)]);
    lines += `<path d="${curvePath(pts)}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.points.forEach(([x, y]) => {
      dots += `<circle class="appx-fls-pt" cx="${X(x)}" cy="${Y(y)}" r="2.8" fill="${color}" stroke="var(--bg,#fff)" stroke-width="1" data-tip="${esc(s.label)} · ${x} · ${y}${s.unit || ''}"/>`;
    });
    const last = s.points[s.points.length - 1];
    labels += `<text x="${X(last[0]) + 5}" y="${Y(last[1]) + 3}" font-size="9.5" font-weight="700" fill="${color}" font-family="Work Sans,system-ui,sans-serif">${esc(s.label.split(' ')[0])}</text>`;
  });

  return `<svg class="appx-fls-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}${lines}${dots}${labels}</svg>`;
}

// --- kind: bars (vaakapalkit, valinnainen kynnyskäytävä) ---
function drawBars(svg, chart) {
  const W = 520, H = 240, P = { t: 14, r: 18, b: 14, l: 140 };
  const bars = chart.bars || [];
  const baseline = chart.baseline ?? 0;
  const vals = bars.map(b => b.value);
  const maxAbs = Math.max(...vals.map(v => Math.abs(v - baseline)), chart.corridor ? chart.corridor.high : 0) * 1.15 || 1;
  const zero = P.l + (W - P.l - P.r) / 2;
  const X = v => zero + (v - baseline) / maxAbs * ((W - P.l - P.r) / 2);
  let corridor = "";
  if (chart.corridor) {
    const { low, high } = chart.corridor;
    corridor = `<rect class="appx-fls-corridor" x="${X(low)}" y="${P.t - 4}" width="${X(high) - X(low)}" height="${H - P.t - P.b + 4}"/>
      <line class="appx-fls-thresh" x1="${X(low)}" y1="${P.t - 4}" x2="${X(low)}" y2="${H - P.b}"/>
      <line class="appx-fls-thresh" x1="${X(high)}" y1="${P.t - 4}" x2="${X(high)}" y2="${H - P.b}"/>`;
  }
  const rowH = (H - P.t - P.b) / bars.length;
  let rows = "";
  bars.forEach((b, i) => {
    const cy = P.t + rowH * i + rowH / 2;
    const out = chart.corridor ? (b.value < chart.corridor.low || b.value > chart.corridor.high) : true;
    const color = out ? ROLE_COLOR(b.tone_role || "primary") : "#a9a29a";
    const bx = Math.min(zero, X(b.value)), bw = Math.abs(X(b.value) - zero);
    rows += `<text x="${P.l - 10}" y="${cy + 4}" text-anchor="end" font-size="11" fill="var(--fg,#1f1b15)" font-family="Work Sans,system-ui,sans-serif">${esc(b.label)}</text>`;
    rows += `<rect class="appx-fls-pt" x="${bx}" y="${cy - 9}" width="${bw}" height="18" rx="2" fill="${color}" data-tip="${esc(b.label)} · ${b.value}"/>`;
    const vx = b.value > baseline ? X(b.value) + 6 : X(b.value) - 6;
    rows += `<text x="${vx}" y="${cy + 4}" text-anchor="${b.value > baseline ? 'start' : 'end'}" font-size="10.5" fill="${color}" font-weight="700" font-family="Work Sans,system-ui,sans-serif">${b.value > baseline ? '+' : ''}${b.value}</text>`;
  });
  const zeroLine = `<line class="appx-fls-zero" x1="${zero}" y1="${P.t - 4}" x2="${zero}" y2="${H - P.b}"/>`;
  return `<svg class="appx-fls-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${corridor}${zeroLine}${rows}</svg>`;
}

// --- kind: sparkline-grid (useita pieniä rinnakkaisia kuvioita) ---
function drawSparkGrid(svg, chart) {
  const W = 520, H = 260, cols = 2, gap = 8;
  const panels = chart.panels || [];
  const rows = Math.ceil(panels.length / cols);
  const cw = (W - gap * (cols + 1)) / cols, ch = (H - gap * (rows + 1)) / rows;
  let out = "";
  panels.forEach((pl, idx) => {
    const cx = gap + (idx % cols) * (cw + gap), cy = gap + Math.floor(idx / cols) * (ch + gap);
    const color = ROLE_COLOR(pl.color_role);
    out += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="4" fill="var(--bg,#fdfbf7)" stroke="var(--line,#e6dfd0)"/>`;
    out += `<text x="${cx + 8}" y="${cy + 14}" font-size="9.5" font-weight="700" fill="var(--fg,#1f1b15)" font-family="Work Sans,system-ui,sans-serif">${esc(pl.label)}</text>`;
    const pts = pl.points, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) * 0.92, y1 = Math.max(...ys) * 1.08;
    const pad = 10;
    const X = x => cx + pad + (x - x0) / (x1 - x0 || 1) * (cw - 2 * pad);
    const Y = v => cy + ch - pad - (v - y0) / (y1 - y0 || 1) * (ch - pad - 22);
    const line = pts.map(([x, y]) => [X(x), Y(y)]);
    out += `<path d="${curvePath(line)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach(([x, y]) => { out += `<circle class="appx-fls-pt" cx="${X(x)}" cy="${Y(y)}" r="2.2" fill="${color}" data-tip="${esc(pl.label)} · ${x} · ${fmtVal(y, pl.fmt)}"/>`; });
    out += `<text x="${cx + 8}" y="${cy + ch - 5}" font-size="8.5" fill="var(--muted-2,#8a8276)" font-family="Work Sans,system-ui,sans-serif">${x0}: ${fmtVal(pts[0][1], pl.fmt)} → ${x1}: ${fmtVal(ys[ys.length - 1], pl.fmt)}</text>`;
  });
  return `<svg class="appx-fls-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
}

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// Catmull-Rom -> kuutiollinen Bézier, pehmeä käyrä datapisteiden läpi. Ei käytetä regressiosuorille (ne pysyvät suorina, koska ne ovat sovituksia, ei dataa).
function curvePath(points, tension = .45) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0][0]} ${points[0][1]} L${points[1][0]} ${points[1][1]}`;
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 6, cp1y = p1[1] + (p2[1] - p0[1]) * tension / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 6, cp2y = p2[1] - (p3[1] - p1[1]) * tension / 6;
    d += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function renderChart(chart) {
  if (!chart || chart.kind === "missing") {
    const items = (chart && chart.required || []).map(k => `<div class="appx-fls-missing-item">${esc(k)}</div>`).join("");
    return `<div class="appx-fls-missing-list">${items}</div>`;
  }
  let svgHtml = "";
  if (chart.kind === "lines") svgHtml = drawLines(null, chart);
  else if (chart.kind === "bars") svgHtml = drawBars(null, chart);
  else if (chart.kind === "sparkline-grid") svgHtml = drawSparkGrid(null, chart);
  return `<div class="appx-fls-chart-card">${svgHtml}</div>`;
}

function renderStats(stats) {
  if (!stats || !stats.length) return "";
  return `<div class="appx-fls-stats">${stats.map(s => `<div class="appx-fls-stat">
    <div class="k">${esc(s[0])}</div><div class="v ${s[3] || ''}">${esc(s[1])}</div><div class="sub">${esc(s[2] || '')}</div>
  </div>`).join("")}</div>`;
}

function renderTier(tier) {
  return `<section class="appx-fls-panel">
    <div class="appx-fls-head">
      <div class="appx-fls-title">${esc(tier.title)}</div>
      <div class="appx-fls-badge ${tier.verdict_status}">${esc(tier.verdict)}</div>
    </div>
    <p class="appx-fls-rule">${tier.rule}</p>
    ${renderChart(tier.chart)}
    ${renderStats(tier.stats)}
    ${tier.note ? `<div class="appx-fls-note">${tier.note}</div>` : ""}
  </section>`;
}

export function render(el_, c, opts) {
  const { util } = opts;
  injectCss(util);

  const tiers = c.tiers || [];
  const uid = "fls-" + Math.random().toString(36).slice(2);

  const tabsHtml = tiers.map((t, i) =>
    `<button class="appx-fls-tab" role="tab" aria-selected="${i === 0}" data-i="${i}">
      <span class="appx-fls-dot ${t.verdict_status}"></span>${esc(t.tier)} · ${esc(t.tier_label)}
    </button>`).join("");

  const panelsHtml = tiers.map((t, i) =>
    `<div class="appx-fls-panel-wrap" data-i="${i}" style="${i === 0 ? '' : 'display:none'}">${renderTier(t)}</div>`).join("");

  const claimHtml = c.claim ? `<p class="appx-fls-claim">${c.claim}</p>` : "";

  const main = `<div class="appx-fls-wrap" id="${uid}">
    ${claimHtml}
    <div class="appx-fls-tabs" role="tablist">${tabsHtml}</div>
    ${panelsHtml}
  </div>
  <div class="appx-fls-tt" id="${uid}-tt"></div>`;

  el_.innerHTML = util.lead(c) + main + util.extras(c) + util.source(c);

  // Tapahtumankäsittely liitetään suoraan tästä render()-funktiosta -- ei luoteta innerHTML:ään upotetun
  // <script>-tagin suoritukseen, koska selaimet eivät aja innerHTML:n kautta lisättyjä <script>-tageja.
  const root = el_.querySelector("#" + uid);
  if (!root) return;
  const tabs = root.querySelectorAll(".appx-fls-tab");
  const panels = root.querySelectorAll(".appx-fls-panel-wrap");
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t, j) => t.setAttribute("aria-selected", i === j));
      panels.forEach((p, j) => { p.style.display = i === j ? "" : "none"; });
    });
  });
  const tip = el_.querySelector("#" + uid + "-tt");
  if (tip) {
    root.addEventListener("mousemove", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) { tip.style.opacity = 0; return; }
      tip.textContent = t.getAttribute("data-tip");
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY + "px";
      tip.style.opacity = 1;
    });
    root.addEventListener("mouseleave", () => { tip.style.opacity = 0; });
  }
}
