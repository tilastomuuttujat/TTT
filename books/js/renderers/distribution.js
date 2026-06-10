// renderers/distribution.js -- jakauma histogrammina, mediaani, kvartiiliväli, poikkeavat.
// Skeema: values[]  bins?  highlight_value?  percentiles?{p25,p50,p75,p90,p10}
//         label?  unit?  groups[]? {name, values[]} (useampi jakauma päällekkäin)

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-distribution", `
    .appx-dist-wrap { margin: 14px 0 0; }
    .appx-dist-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-dist-bar { fill: var(--accent, #1f1b15); fill-opacity: .55; transition: fill-opacity .12s; }
    .appx-dist-bar:hover { fill-opacity: .85; cursor: default; }
    .appx-dist-bar-g0 { fill: var(--accent, #1f1b15); fill-opacity: .5; }
    .appx-dist-bar-g1 { fill: var(--danger, #a3271a); fill-opacity: .45; }
    .appx-dist-bar-g2 { fill: var(--muted, #6b6356); fill-opacity: .5; }
    .appx-dist-bar-g0:hover, .appx-dist-bar-g1:hover, .appx-dist-bar-g2:hover { fill-opacity: .85; }
    .appx-dist-bar-hl { fill: var(--danger, #a3271a); fill-opacity: .7; }
    .appx-dist-axis { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; }
    .appx-dist-grid { stroke: var(--line, #e6dfd0); stroke-width: 1; stroke-dasharray: 3 4; }
    .appx-dist-label { font-size: 11px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-dist-axis-label { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    .appx-dist-median { stroke: var(--fg, #1f1b15); stroke-width: 2; stroke-dasharray: 4 2; }
    .appx-dist-iqr { fill: var(--accent, #1f1b15); fill-opacity: .08; stroke: var(--accent, #1f1b15); stroke-width: 1; stroke-opacity: .25; }
    .appx-dist-pct { stroke: var(--muted-2, #8a8276); stroke-width: 1; stroke-dasharray: 2 3; }
    .appx-dist-hl-line { stroke: var(--danger, #a3271a); stroke-width: 1.5; }
    .appx-dist-outlier { fill: var(--danger, #a3271a); fill-opacity: .7; }
    .appx-dist-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; margin-top: 10px; }
    .appx-dist-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 5px 10px; }
    .appx-dist-stat b { display: block; color: var(--fg, #1f1b15); font-weight: 600; font-size: 14px; }
    .appx-dist-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .appx-dist-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b6356); }
    .appx-dist-legend-box { width: 12px; height: 10px; border-radius: 2px; flex-shrink: 0; }
    .appx-dist-tt { position: absolute; pointer-events: none; background: var(--card, #fff); border: 1px solid var(--line-strong, #c9bfa9); border-radius: 5px; font-size: 11px; color: var(--fg-soft, #3a332a); padding: 4px 8px; white-space: nowrap; display: none; font-family: "Work Sans", system-ui, sans-serif; }
  `);
}

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const p25 = percentile(sorted, 25);
  const p50 = percentile(sorted, 50);
  const p75 = percentile(sorted, 75);
  const p10 = percentile(sorted, 10);
  const p90 = percentile(sorted, 90);
  const iqr = p75 - p25;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const fence_lo = p25 - 1.5 * iqr;
  const fence_hi = p75 + 1.5 * iqr;
  const outliers = sorted.filter(v => v < fence_lo || v > fence_hi);
  return { sorted, n, mean, p10, p25, p50, p75, p90, iqr, std, fence_lo, fence_hi, outliers, min: sorted[0], max: sorted[n - 1] };
}

function makeHistogram(values, bins) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const bw = range / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    const i = Math.min(bins - 1, Math.floor((v - min) / bw));
    counts[i]++;
  });
  return counts.map((count, i) => ({
    x0: min + i * bw, x1: min + (i + 1) * bw, count, density: count / (values.length * bw)
  }));
}

function buildSvg(groups, highlightValue, unit, providedPercentiles, wrapId) {
  const W = 520, H = 260;
  const pad = { top: 14, right: 20, bottom: 40, left: 48 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const allVals = groups.flatMap(g => g.values);
  if (!allVals.length) return "<p style='color:var(--muted)'>Ei dataa.</p>";

  const globalMin = Math.min(...allVals), globalMax = Math.max(...allVals);
  const range = globalMax - globalMin || 1;
  const bins = groups[0].bins || Math.max(8, Math.min(30, Math.ceil(Math.sqrt(groups[0].values.length))));

  // histogrammit kaikille ryhmille
  const histograms = groups.map(g => makeHistogram(g.values, bins));
  const maxCount = Math.max(...histograms.flatMap(h => h.map(b => b.count)));

  const xa = globalMin - range * 0.03, xb = globalMax + range * 0.03;
  const px = v => pad.left + ((v - xa) / (xb - xa)) * iw;
  const py = v => pad.top + ih - (v / maxCount) * ih;

  const GROUP_FILLS = [
    "var(--accent,#1f1b15)", "var(--danger,#a3271a)", "var(--muted,#6b6356)"
  ];

  // ruudukko
  const yTicks = 4;
  let grid = "";
  for (let i = 0; i <= yTicks; i++) {
    const yv = maxCount * i / yTicks;
    const cy = py(yv);
    grid += `<line class="appx-dist-grid" x1="${pad.left}" y1="${cy}" x2="${pad.left + iw}" y2="${cy}"/>`;
    grid += `<text class="appx-dist-label" x="${pad.left - 5}" y="${cy + 4}" text-anchor="end">${Math.round(yv)}</text>`;
  }

  // x-ticks
  const xSteps = 5;
  for (let i = 0; i <= xSteps; i++) {
    const xv = globalMin + (range * i / xSteps);
    grid += `<text class="appx-dist-label" x="${px(xv)}" y="${pad.top + ih + 14}" text-anchor="middle">${+xv.toPrecision(4)}</text>`;
  }

  const axes = `
    <line class="appx-dist-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ih}"/>
    <line class="appx-dist-axis" x1="${pad.left}" y1="${pad.top + ih}" x2="${pad.left + iw}" y2="${pad.top + ih}"/>`;

  // histogrammipalkit
  const barsHtml = histograms.map((hist, gi) => {
    const fill = GROUP_FILLS[gi % GROUP_FILLS.length];
    const groupClass = groups.length > 1 ? `appx-dist-bar-g${gi}` : "appx-dist-bar";
    return hist.map((b, bi) => {
      const x0 = px(b.x0), x1 = px(b.x1);
      const bw = Math.max(1, x1 - x0 - (groups.length > 1 ? 0 : 1));
      const top = py(b.count);
      const h = ih - (top - pad.top);
      if (h <= 0) return "";
      // tarkista sisältääkö highlight-arvo
      const isHl = highlightValue !== null && highlightValue >= b.x0 && highlightValue < b.x1;
      const cls = isHl ? "appx-dist-bar-hl" : groupClass;
      const xPos = groups.length > 1 ? x0 + gi * (bw / groups.length) : x0;
      const bwi = groups.length > 1 ? bw / groups.length : bw;
      return `<rect class="${cls}" x="${xPos}" y="${top}" width="${bwi}" height="${h}" data-bi="${bi}" data-gi="${gi}"/>`;
    }).join("");
  }).join("");

  // stats overlay (mediaani, IQR)
  const stats = computeStats(groups[0].values);
  const p25 = providedPercentiles ? (providedPercentiles.p25 || stats.p25) : stats.p25;
  const p50 = providedPercentiles ? (providedPercentiles.p50 || stats.p50) : stats.p50;
  const p75 = providedPercentiles ? (providedPercentiles.p75 || stats.p75) : stats.p75;

  const iqrBand = `<rect class="appx-dist-iqr" x="${px(p25)}" y="${pad.top}" width="${px(p75) - px(p25)}" height="${ih}"/>`;
  const medianLine = `<line class="appx-dist-median" x1="${px(p50)}" y1="${pad.top}" x2="${px(p50)}" y2="${pad.top + ih}"/>`;
  const medianLabel = `<text class="appx-dist-label" x="${px(p50)}" y="${pad.top - 2}" text-anchor="middle" style="fill:var(--fg,#1f1b15);font-weight:600">Med</text>`;

  // highlight-viiva
  let hlLine = "";
  if (highlightValue !== null && highlightValue !== undefined) {
    hlLine = `<line class="appx-dist-hl-line" x1="${px(highlightValue)}" y1="${pad.top}" x2="${px(highlightValue)}" y2="${pad.top + ih}"/>`;
  }

  // poikkeavat havainnot pisteinä alla
  const outlierDots = stats.outliers.map(v =>
    `<circle class="appx-dist-outlier" cx="${px(v)}" cy="${pad.top + ih + 24}" r="3"/>`
  ).join("");

  return `<svg class="appx-dist-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${axes}${iqrBand}${barsHtml}${medianLine}${medianLabel}${hlLine}${outlierDots}
  </svg>`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  // normalisoi ryhmät
  let groups = [];
  if (Array.isArray(c.groups) && c.groups.length) {
    groups = c.groups.map(g => ({
      name: g.name || "",
      values: (g.values || []).map(Number).filter(isFinite),
      bins: c.bins || g.bins || null,
    }));
  } else if (Array.isArray(c.values) && c.values.length) {
    groups = [{ name: c.label || "", values: c.values.map(Number).filter(isFinite), bins: c.bins || null }];
  }

  groups = groups.filter(g => g.values.length > 0);
  if (!groups.length) {
    el.innerHTML = util.lead(c) + `<div class="appx-note">Ei dataa.</div>` + util.source(c);
    return;
  }

  const highlightValue = c.highlight_value !== undefined ? +c.highlight_value : null;
  const unit = c.unit || "";
  const providedPercentiles = c.percentiles || null;
  const wrapId = "dist-" + Math.random().toString(36).slice(2);

  const svgHtml = buildSvg(groups, highlightValue, unit, providedPercentiles, wrapId);

  // tilastot ensimmäisestä ryhmästä
  const stats = computeStats(groups[0].values);
  const fmt = v => (Number.isInteger(v) ? v : +v.toPrecision(4)) + (unit ? " " + unit : "");

  const statsHtml = `<div class="appx-dist-stats">
    <div class="appx-dist-stat"><b>${fmt(stats.p50)}</b>mediaani</div>
    <div class="appx-dist-stat"><b>${fmt(stats.mean)}</b>keskiarvo</div>
    <div class="appx-dist-stat"><b>${fmt(stats.p25)}–${fmt(stats.p75)}</b>kvartiiliväli</div>
    <div class="appx-dist-stat"><b>${fmt(stats.std)}</b>keskihajonta</div>
    <div class="appx-dist-stat"><b>${stats.n}</b>havaintoja</div>
    ${stats.outliers.length ? `<div class="appx-dist-stat"><b>${stats.outliers.length}</b>poikkeavia</div>` : ""}
    ${highlightValue !== null ? `<div class="appx-dist-stat"><b>${fmt(highlightValue)}</b>korostettu arvo</div>` : ""}
  </div>`;

  const legendHtml = groups.length > 1
    ? `<div class="appx-dist-legend">${groups.map((g, gi) => {
        const fills = ["var(--accent,#1f1b15)", "var(--danger,#a3271a)", "var(--muted,#6b6356)"];
        return `<div class="appx-dist-legend-item"><div class="appx-dist-legend-box" style="background:${fills[gi % fills.length]}"></div>${esc(g.name)}</div>`;
      }).join("")}</div>` : "";

  const keyHtml = `<div class="appx-dist-legend" style="margin-top:6px">
    <div class="appx-dist-legend-item"><div style="width:22px;height:2px;background:var(--fg,#1f1b15);border-top:2px dashed var(--fg,#1f1b15)"></div>Mediaani</div>
    <div class="appx-dist-legend-item"><div style="width:22px;height:10px;background:var(--accent,#1f1b15);opacity:.1;border:1px solid var(--accent,#1f1b15);border-radius:2px"></div>Kvartiiliväli (IQR)</div>
    ${stats.outliers.length ? `<div class="appx-dist-legend-item"><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="var(--danger,#a3271a)" opacity=".7"/></svg>Poikkeavat</div>` : ""}
    ${highlightValue !== null ? `<div class="appx-dist-legend-item"><div style="width:2px;height:14px;background:var(--danger,#a3271a);margin:0 10px 0 0"></div>Korostettu arvo</div>` : ""}
  </div>`;

  const main = `<div class="appx-dist-wrap">${svgHtml}${statsHtml}${legendHtml}${keyHtml}</div>`;
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}