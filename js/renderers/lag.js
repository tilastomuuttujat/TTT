// renderers/lag.js -- viiveanalyysi: kaksi aikasarjaa + ristikorrelaatiokaavio.
// Skeema: series_a[]  series_b[]  labels[]  lag_periods (numero, voi olla negatiivinen)
//         a_label  b_label  x_label  y_label
//         Vaihtoehtoisesti: cross_correlation[] (ristikorrelaatioarvot valmiina)

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-lag", `
    .appx-lag-wrap { margin: 14px 0 0; }
    .appx-lag-panels { display: grid; gap: 12px; }
    .appx-lag-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-lag-grid { stroke: var(--line, #e6dfd0); stroke-width: 1; stroke-dasharray: 3 4; }
    .appx-lag-axis { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; }
    .appx-lag-zero { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; stroke-dasharray: 4 3; }
    .appx-lag-line-a { stroke: var(--fg-soft, #3a332a); stroke-width: 2; fill: none; stroke-linejoin: round; }
    .appx-lag-line-b { stroke: var(--accent, #1f1b15); stroke-width: 2; fill: none; stroke-linejoin: round; stroke-dasharray: 5 3; }
    .appx-lag-line-b-shifted { stroke: var(--danger, #a3271a); stroke-width: 1.5; fill: none; stroke-linejoin: round; opacity: .7; }
    .appx-lag-label { font-size: 11px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-lag-axis-label { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    .appx-lag-panel-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--muted-2, #8a8276); margin-bottom: 5px; }
    .appx-lag-arrow { marker-end: url(#lag-arrow); stroke: var(--danger, #a3271a); stroke-width: 1.5; fill: none; }
    .appx-lag-bar { fill: var(--accent, #1f1b15); fill-opacity: .65; }
    .appx-lag-bar-peak { fill: var(--danger, #a3271a); fill-opacity: .85; }
    .appx-lag-bar-neg { fill: var(--muted, #6b6356); fill-opacity: .5; }
    .appx-lag-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .appx-lag-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 4px 10px; }
    .appx-lag-stat b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-lag-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; }
    .appx-lag-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b6356); }
    .appx-lag-legend-line { width: 22px; height: 2px; border-radius: 1px; flex-shrink: 0; }
  `);
}

// Normalisoi sarja nollakeskiarvoon ja ykkösvarianssin
function normalize(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  return arr.map(v => (v - mean) / std);
}

// Laske ristikorrelaatio viiveellä lag (-maxLag..+maxLag)
function crossCorrelation(a, b, maxLag) {
  const na = normalize(a), nb = normalize(b);
  const n = Math.min(na.length, nb.length);
  const result = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let sum = 0, count = 0;
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j >= 0 && j < n) { sum += na[i] * nb[j]; count++; }
    }
    result.push({ lag, r: count > 0 ? sum / count : 0 });
  }
  return result;
}

function buildTimeSeriesSvg(seriesA, seriesB, seriesBshifted, labels, aLabel, bLabel, lagPeriods, svgId) {
  const W = 520, H = 220;
  const pad = { top: 14, right: 20, bottom: 38, left: 48 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const n = Math.max(seriesA.length, seriesB.length);
  if (!n) return "";

  const allVals = [...seriesA, ...seriesB].filter(isFinite);
  const yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  const yRange = yMax - yMin || 1;
  const ya = yMin - yRange * .1, yb = yMax + yRange * .1;

  const px = i => pad.left + (i / (n - 1)) * iw;
  const py = v => pad.top + ih - ((v - ya) / (yb - ya)) * ih;

  const yTicks = 3;
  let grid = "";
  for (let i = 0; i <= yTicks; i++) {
    const yv = ya + (yb - ya) * i / yTicks;
    grid += `<line class="appx-lag-grid" x1="${pad.left}" y1="${py(yv)}" x2="${pad.left + iw}" y2="${py(yv)}"/>`;
    grid += `<text class="appx-lag-label" x="${pad.left - 5}" y="${py(yv) + 4}" text-anchor="end">${+yv.toPrecision(3)}</text>`;
  }
  const xStep = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += xStep) {
    const lbl = (labels && labels[i]) ? String(labels[i]) : String(i + 1);
    grid += `<text class="appx-lag-label" x="${px(i)}" y="${pad.top + ih + 13}" text-anchor="middle">${lbl}</text>`;
  }

  const axes = `
    <line class="appx-lag-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ih}"/>
    <line class="appx-lag-axis" x1="${pad.left}" y1="${pad.top + ih}" x2="${pad.left + iw}" y2="${pad.top + ih}"/>`;

  const lineA = seriesA.length > 1
    ? `<polyline class="appx-lag-line-a" points="${seriesA.map((v, i) => `${px(i)},${py(v)}`).join(" ")}"/>`
    : "";
  const lineB = seriesB.length > 1
    ? `<polyline class="appx-lag-line-b" points="${seriesB.map((v, i) => `${px(i)},${py(v)}`).join(" ")}"/>`
    : "";

  // siirretty B (viivekorjattu)
  let lineBsh = "";
  if (seriesBshifted && seriesBshifted.length > 1 && lagPeriods !== 0) {
    lineBsh = `<polyline class="appx-lag-line-b-shifted" points="${seriesBshifted.map((v, i) => {
      const j = i + lagPeriods;
      if (j < 0 || j >= n) return "";
      return `${px(j)},${py(v)}`;
    }).filter(Boolean).join(" ")}"/>`;
  }

  // viivanuoli
  let arrow = "";
  if (lagPeriods && seriesA.length > 0 && seriesB.length > 0) {
    const midIdx = Math.floor(n / 2);
    const ax1 = px(midIdx), ay1 = py(seriesA[midIdx] || 0);
    const bx1 = px(Math.max(0, midIdx - lagPeriods));
    const by1 = py(seriesB[Math.max(0, midIdx - lagPeriods)] || 0);
    arrow = `<defs><marker id="lag-arrow-${svgId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="var(--danger,#a3271a)"/>
    </marker></defs>
    <path class="appx-lag-arrow" style="marker-end:url(#lag-arrow-${svgId})" d="M${ax1},${ay1} C${ax1},${(ay1 + by1) / 2} ${bx1},${(ay1 + by1) / 2} ${bx1},${by1}"/>`;
  }

  return `<svg class="appx-lag-svg" viewBox="0 0 ${W} ${H}" id="${svgId}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${axes}${arrow}${lineA}${lineB}${lineBsh}
  </svg>`;
}

function buildCorrSvg(xcorr, peakLag) {
  if (!xcorr || !xcorr.length) return "";
  const W = 520, H = 160;
  const pad = { top: 14, right: 20, bottom: 30, left: 48 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const rMin = Math.min(...xcorr.map(x => x.r), -0.1);
  const rMax = Math.max(...xcorr.map(x => x.r), 0.1);
  const ya = rMin - 0.05, yb = rMax + 0.05;
  const n = xcorr.length;
  const bw = Math.max(2, iw / n - 2);

  const px = i => pad.left + (i + 0.5) * (iw / n);
  const py = v => pad.top + ih - ((v - ya) / (yb - ya)) * ih;
  const py0 = py(0);

  let bars = "";
  xcorr.forEach((item, i) => {
    const cx = px(i);
    const top = Math.min(py(item.r), py0);
    const h = Math.abs(py(item.r) - py0);
    const cls = item.lag === peakLag ? "appx-lag-bar-peak" : (item.r < 0 ? "appx-lag-bar-neg" : "appx-lag-bar");
    bars += `<rect class="${cls}" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(h, 1)}"/>`;
  });

  // nollaviiva
  const zeroLine = `<line class="appx-lag-zero" x1="${pad.left}" y1="${py0}" x2="${pad.left + iw}" y2="${py0}"/>`;

  // y-ticks
  let yticks = "";
  [-1, -0.5, 0, 0.5, 1].forEach(v => {
    if (v < ya || v > yb) return;
    yticks += `<text class="appx-lag-label" x="${pad.left - 5}" y="${py(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`;
  });

  // x-ticks (vain parilliset)
  let xticks = "";
  xcorr.forEach((item, i) => {
    if (item.lag % 2 === 0) xticks += `<text class="appx-lag-label" x="${px(i)}" y="${pad.top + ih + 13}" text-anchor="middle">${item.lag}</text>`;
  });

  const axes = `
    <line class="appx-lag-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ih}"/>
    <line class="appx-lag-axis" x1="${pad.left}" y1="${pad.top + ih}" x2="${pad.left + iw}" y2="${pad.top + ih}"/>`;

  return `<div style="margin-top:10px"><div class="appx-lag-panel-title">Ristikorrelaatio viiveittäin</div>
    <svg class="appx-lag-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${yticks}${xticks}${axes}${zeroLine}${bars}
    </svg></div>`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const seriesA = (c.series_a || []).map(Number).filter(isFinite);
  const seriesB = (c.series_b || []).map(Number).filter(isFinite);
  const labels = c.labels || c.x_labels || [];
  const aLabel = c.a_label || "A";
  const bLabel = c.b_label || "B";
  const lagPeriods = c.lag_periods !== undefined ? +c.lag_periods : 0;
  const maxLag = c.max_lag || Math.min(Math.floor(Math.max(seriesA.length, seriesB.length) / 3), 15);

  // laske tai käytä annettua ristikorrelaatiota
  let xcorr = [];
  if (Array.isArray(c.cross_correlation) && c.cross_correlation.length) {
    xcorr = c.cross_correlation.map(x => typeof x === "object" ? x : { lag: xcorr.length - maxLag, r: +x });
  } else if (seriesA.length && seriesB.length) {
    xcorr = crossCorrelation(seriesA, seriesB, maxLag);
  }

  const peakEntry = xcorr.length ? xcorr.reduce((a, b) => Math.abs(b.r) > Math.abs(a.r) ? b : a, xcorr[0]) : null;
  const peakLag = peakEntry ? peakEntry.lag : lagPeriods;

  // siirretty B lagPeriods mukaan
  const bShifted = lagPeriods !== 0 ? seriesB.slice() : [];

  const svgId = "lag-" + Math.random().toString(36).slice(2);
  const tsSvg = buildTimeSeriesSvg(seriesA, seriesB, bShifted, labels, aLabel, bLabel, lagPeriods, svgId);
  const corrSvg = buildCorrSvg(xcorr, peakLag);

  const statsHtml = `<div class="appx-lag-stats">
    ${peakEntry ? `<div class="appx-lag-stat">vahvin korrelaatio viiveellä <b>${peakLag}</b></div>` : ""}
    ${peakEntry ? `<div class="appx-lag-stat">r <b>${peakEntry.r.toFixed(3)}</b></div>` : ""}
    ${lagPeriods !== 0 ? `<div class="appx-lag-stat">asetettu viive <b>${lagPeriods}</b></div>` : ""}
    <div class="appx-lag-stat">n <b>${Math.min(seriesA.length, seriesB.length)}</b></div>
  </div>`;

  const legendHtml = `<div class="appx-lag-legend">
    <div class="appx-lag-legend-item"><div class="appx-lag-legend-line" style="background:var(--fg-soft,#3a332a)"></div>${esc(aLabel)}</div>
    <div class="appx-lag-legend-item"><div class="appx-lag-legend-line" style="background:var(--accent,#1f1b15);opacity:.7;border-top:2px dashed var(--accent,#1f1b15)"></div>${esc(bLabel)}</div>
    ${lagPeriods !== 0 ? `<div class="appx-lag-legend-item"><div class="appx-lag-legend-line" style="background:var(--danger,#a3271a);opacity:.7"></div>${esc(bLabel)} siirretty (viive ${lagPeriods})</div>` : ""}
  </div>`;

  const main = `<div class="appx-lag-wrap">
    <div class="appx-lag-panel-title">Aikasarjat${lagPeriods !== 0 ? " · viive " + lagPeriods : ""}</div>
    ${tsSvg}${statsHtml}${legendHtml}${corrSvg}
  </div>`;

  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}