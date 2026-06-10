// renderers/correlation.js -- hajontakaavio kahdesta muuttujasta.
// Skeema: points[] {x, y, label?}  x_label  y_label  r_squared?
//         Vaihtoehtoisesti: series[] {name, points[]}  (useampi joukko)

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-correlation", `
    .appx-corr-wrap { margin: 14px 0 0; }
    .appx-corr-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-corr-axis { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; }
    .appx-corr-grid { stroke: var(--line, #e6dfd0); stroke-width: 1; stroke-dasharray: 3 4; }
    .appx-corr-dot { fill: var(--accent, #1f1b15); fill-opacity: .72; stroke: none; cursor: default; transition: fill-opacity .15s, r .15s; }
    .appx-corr-dot:hover { fill-opacity: 1; }
    .appx-corr-trend { stroke: var(--accent-soft, #4a4034); stroke-width: 1.5; fill: none; stroke-dasharray: 5 3; opacity: .7; }
    .appx-corr-label { font-size: 11px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-corr-axis-label { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    .appx-corr-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .appx-corr-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 4px 10px; }
    .appx-corr-stat b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-corr-tooltip { pointer-events: none; }
    .appx-corr-tooltip rect { fill: var(--card, #fff); stroke: var(--line-strong, #c9bfa9); rx: 4; }
    .appx-corr-tooltip text { font-size: 11px; fill: var(--fg-soft, #3a332a); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-corr-series-dot-0 { fill: var(--accent, #1f1b15); }
    .appx-corr-series-dot-1 { fill: var(--danger, #a3271a); }
    .appx-corr-series-dot-2 { fill: var(--muted, #6b6356); }
    .appx-corr-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .appx-corr-legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted, #6b6356); }
    .appx-corr-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  `);
}

function linReg(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (const p of pts) { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; syy += p.y * p.y; }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const p of pts) {
    ssTot += (p.y - yMean) ** 2;
    ssRes += (p.y - (slope * p.x + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function buildSvg(allSeries, xLabel, yLabel, providedR2) {
  const W = 520, H = 320;
  const pad = { top: 16, right: 20, bottom: 44, left: 52 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  // kaikki pisteet yhteen min/max-laskentaan
  const allPts = allSeries.flatMap(s => s.points);
  if (!allPts.length) return "<p class='appx-corr-wrap' style='color:var(--muted)'>Ei datapisteitä.</p>";

  const xMin = Math.min(...allPts.map(p => p.x));
  const xMax = Math.max(...allPts.map(p => p.x));
  const yMin = Math.min(...allPts.map(p => p.y));
  const yMax = Math.max(...allPts.map(p => p.y));

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xPad = xRange * .08, yPad = yRange * .10;
  const xa = xMin - xPad, xb = xMax + xPad;
  const ya = yMin - yPad, yb = yMax + yPad;

  const px = x => pad.left + ((x - xa) / (xb - xa)) * iw;
  const py = y => pad.top + ih - ((y - ya) / (yb - ya)) * ih;

  // ruudukko
  const xTicks = 5, yTicks = 4;
  let grid = "";
  for (let i = 0; i <= xTicks; i++) {
    const xv = xa + (xb - xa) * i / xTicks;
    const cx = px(xv);
    grid += `<line class="appx-corr-grid" x1="${cx}" y1="${pad.top}" x2="${cx}" y2="${pad.top + ih}"/>`;
    grid += `<text class="appx-corr-label" x="${cx}" y="${pad.top + ih + 14}" text-anchor="middle">${+xv.toPrecision(3)}</text>`;
  }
  for (let i = 0; i <= yTicks; i++) {
    const yv = ya + (yb - ya) * i / yTicks;
    const cy = py(yv);
    grid += `<line class="appx-corr-grid" x1="${pad.left}" y1="${cy}" x2="${pad.left + iw}" y2="${cy}"/>`;
    grid += `<text class="appx-corr-label" x="${pad.left - 6}" y="${cy + 4}" text-anchor="end">${+yv.toPrecision(3)}</text>`;
  }

  // akselit
  const axes = `
    <line class="appx-corr-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ih}"/>
    <line class="appx-corr-axis" x1="${pad.left}" y1="${pad.top + ih}" x2="${pad.left + iw}" y2="${pad.top + ih}"/>`;

  // akseliotsikot
  const axLabels = `
    <text class="appx-corr-axis-label" x="${pad.left + iw / 2}" y="${H - 2}" text-anchor="middle">${xLabel}</text>
    <text class="appx-corr-axis-label" x="12" y="${pad.top + ih / 2}" text-anchor="middle" transform="rotate(-90,12,${pad.top + ih / 2})">${yLabel}</text>`;

  const SERIES_FILLS = ["var(--accent,#1f1b15)", "var(--danger,#a3271a)", "var(--muted,#6b6356)"];

  // trendiviiva ja pisteet per sarja
  let trends = "", dots = "", tooltips = "";
  let allReg = null;

  allSeries.forEach((s, si) => {
    const fill = SERIES_FILLS[si % SERIES_FILLS.length];
    const reg = linReg(s.points);
    if (si === 0) allReg = reg;

    if (reg) {
      const tx1 = xa, ty1 = reg.slope * tx1 + reg.intercept;
      const tx2 = xb, ty2 = reg.slope * tx2 + reg.intercept;
      trends += `<line class="appx-corr-trend" x1="${px(tx1)}" y1="${py(ty1)}" x2="${px(tx2)}" y2="${py(ty2)}" style="stroke:${fill}"/>`;
    }

    s.points.forEach((p, pi) => {
      const cx = px(p.x), cy = py(p.y);
      const tid = `corr-tt-${si}-${pi}`;
      dots += `<circle class="appx-corr-dot" cx="${cx}" cy="${cy}" r="5" style="fill:${fill}" data-tt="${tid}"/>`;
      if (p.label) {
        const lbl = String(p.label).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
        const tw = Math.max(lbl.length * 6 + 16, 60);
        tooltips += `<g class="appx-corr-tooltip" id="${tid}" style="display:none">
          <rect x="${cx + 8}" y="${cy - 18}" width="${tw}" height="18" rx="4" ry="4"/>
          <text x="${cx + 16}" y="${cy - 5}">${lbl}</text>
        </g>`;
      }
    });
  });

  const r2Val = providedR2 !== undefined ? providedR2 : (allReg ? allReg.r2 : null);

  const svgId = "corr-" + Math.random().toString(36).slice(2);
  const svg = `<svg class="appx-corr-svg" viewBox="0 0 ${W} ${H}" id="${svgId}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${axes}${axLabels}${trends}${dots}${tooltips}
  </svg>`;

  // tooltip-interaktio
  const script = `<script>(function(){
    var s=document.getElementById('${svgId}');
    if(!s)return;
    s.querySelectorAll('.appx-corr-dot').forEach(function(d){
      var tid=d.getAttribute('data-tt');
      var tt=tid?s.querySelector('#'+tid):null;
      if(!tt)return;
      d.addEventListener('mouseenter',function(){tt.style.display='';});
      d.addEventListener('mouseleave',function(){tt.style.display='none';});
    });
  })();<\/script>`;

  const r2Html = r2Val !== null
    ? `<div class="appx-corr-stat">R² <b>${r2Val.toFixed(3)}</b></div>`
    : "";
  const nHtml = `<div class="appx-corr-stat">n <b>${allPts.length}</b></div>`;
  const slopeHtml = allReg ? `<div class="appx-corr-stat">kulmakerroin <b>${allReg.slope.toFixed(3)}</b></div>` : "";
  const stats = `<div class="appx-corr-stats">${r2Html}${nHtml}${slopeHtml}</div>`;

  const legend = allSeries.length > 1
    ? `<div class="appx-corr-legend">${allSeries.map((s, si) =>
        `<div class="appx-corr-legend-item"><div class="appx-corr-legend-dot" style="background:${SERIES_FILLS[si % SERIES_FILLS.length]}"></div>${s.name || "Sarja " + (si + 1)}</div>`
      ).join("")}</div>` : "";

  return `<div class="appx-corr-wrap">${svg}${stats}${legend}${script}</div>`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);

  // normalisoi sarjat
  let allSeries = [];
  if (Array.isArray(c.series) && c.series.length) {
    allSeries = c.series.map(s => ({
      name: s.name || "",
      points: (s.points || []).map(p => ({ x: +p.x, y: +p.y, label: p.label || "" })).filter(p => isFinite(p.x) && isFinite(p.y)),
    }));
  } else if (Array.isArray(c.points) && c.points.length) {
    allSeries = [{ name: "", points: c.points.map(p => ({ x: +p.x, y: +p.y, label: p.label || "" })).filter(p => isFinite(p.x) && isFinite(p.y)) }];
  }

  const xLabel = c.x_label || c.x_axis || "x";
  const yLabel = c.y_label || c.y_axis || "y";
  const providedR2 = (c.r_squared !== undefined && c.r_squared !== null) ? +c.r_squared : undefined;

  const main = buildSvg(allSeries, xLabel, yLabel, providedR2);
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}