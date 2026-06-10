// renderers/regression.js -- aikasarja havaitulla + ennustetulla käyrällä, luottamusväli.
// Skeema: observed[]  predicted[]  confidence[]  labels[]  x_label  y_label
//         Kukin arvo on numero. confidence[i] = {low, high} TAI yksittäinen luku (±offset).

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-regression", `
    .appx-reg-wrap { margin: 14px 0 0; }
    .appx-reg-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-reg-grid { stroke: var(--line, #e6dfd0); stroke-width: 1; stroke-dasharray: 3 4; }
    .appx-reg-axis { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; }
    .appx-reg-band { fill: var(--accent, #1f1b15); fill-opacity: .08; stroke: none; }
    .appx-reg-observed { stroke: var(--fg-soft, #3a332a); stroke-width: 2; fill: none; stroke-linejoin: round; stroke-linecap: round; }
    .appx-reg-predicted { stroke: var(--accent, #1f1b15); stroke-width: 2; fill: none; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 6 3; }
    .appx-reg-dot-obs { fill: var(--fg-soft, #3a332a); stroke: var(--bg, #fdfbf7); stroke-width: 1.5; }
    .appx-reg-dot-pred { fill: var(--accent, #1f1b15); stroke: var(--bg, #fdfbf7); stroke-width: 1.5; }
    .appx-reg-label { font-size: 11px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-reg-axis-label { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    .appx-reg-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; }
    .appx-reg-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b6356); }
    .appx-reg-legend-line { width: 22px; height: 2px; border-radius: 1px; flex-shrink: 0; }
    .appx-reg-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .appx-reg-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 4px 10px; }
    .appx-reg-stat b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-reg-cursor { stroke: var(--line-strong, #c9bfa9); stroke-width: 1; stroke-dasharray: 2 2; pointer-events: none; }
    .appx-reg-hover-dot { fill: var(--accent, #1f1b15); stroke: var(--bg, #fdfbf7); stroke-width: 2; pointer-events: none; }
    .appx-reg-tt { pointer-events: none; }
    .appx-reg-tt rect { fill: var(--card, #fff); stroke: var(--line-strong, #c9bfa9); }
    .appx-reg-tt text { font-size: 11px; fill: var(--fg-soft, #3a332a); font-family: "Work Sans", system-ui, sans-serif; }
  `);
}

function rmse(obs, pred) {
  if (!obs.length || obs.length !== pred.length) return null;
  let sum = 0;
  for (let i = 0; i < obs.length; i++) sum += (obs[i] - pred[i]) ** 2;
  return Math.sqrt(sum / obs.length);
}

function mae(obs, pred) {
  if (!obs.length || obs.length !== pred.length) return null;
  let sum = 0;
  for (let i = 0; i < obs.length; i++) sum += Math.abs(obs[i] - pred[i]);
  return sum / obs.length;
}

function polyline(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

function buildSvg(observed, predicted, confidence, labels, xLabel, yLabel, showDots) {
  const W = 520, H = 300;
  const pad = { top: 16, right: 20, bottom: 44, left: 52 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const allVals = [...observed, ...predicted,
    ...confidence.map(c => c.high), ...confidence.map(c => c.low)
  ].filter(isFinite);
  if (!allVals.length) return "<p style='color:var(--muted)'>Ei dataa.</p>";

  const n = Math.max(observed.length, predicted.length);
  const yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  const yRange = yMax - yMin || 1;
  const ya = yMin - yRange * .08, yb = yMax + yRange * .08;

  const px = i => pad.left + (i / (n - 1)) * iw;
  const py = v => pad.top + ih - ((v - ya) / (yb - ya)) * ih;

  // ruudukko
  const yTicks = 4;
  let grid = "", xTickLabels = "";
  for (let i = 0; i <= yTicks; i++) {
    const yv = ya + (yb - ya) * i / yTicks;
    const cy = py(yv);
    grid += `<line class="appx-reg-grid" x1="${pad.left}" y1="${cy}" x2="${pad.left + iw}" y2="${cy}"/>`;
    grid += `<text class="appx-reg-label" x="${pad.left - 6}" y="${cy + 4}" text-anchor="end">${+yv.toPrecision(3)}</text>`;
  }

  // x-akselimerkit
  const xStep = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += xStep) {
    const cx = px(i);
    const lbl = (labels && labels[i]) ? String(labels[i]) : String(i + 1);
    xTickLabels += `<text class="appx-reg-label" x="${cx}" y="${pad.top + ih + 14}" text-anchor="middle">${lbl}</text>`;
  }

  const axes = `
    <line class="appx-reg-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ih}"/>
    <line class="appx-reg-axis" x1="${pad.left}" y1="${pad.top + ih}" x2="${pad.left + iw}" y2="${pad.top + ih}"/>`;

  const axLabels = `
    <text class="appx-reg-axis-label" x="${pad.left + iw / 2}" y="${H - 2}" text-anchor="middle">${xLabel}</text>
    <text class="appx-reg-axis-label" x="12" y="${pad.top + ih / 2}" text-anchor="middle" transform="rotate(-90,12,${pad.top + ih / 2})">${yLabel}</text>`;

  // luottamusvälivyöhyke
  let band = "";
  if (confidence.length >= 2) {
    const upper = predicted.map((_, i) => [px(i), py(confidence[i] ? confidence[i].high : predicted[i])]);
    const lower = [...predicted.map((_, i) => [px(i), py(confidence[i] ? confidence[i].low : predicted[i])])].reverse();
    band = `<polygon class="appx-reg-band" points="${[...upper, ...lower].map(([x, y]) => `${x},${y}`).join(" ")}"/>`;
  }

  // viivat
  const obsPts = observed.map((v, i) => [px(i), py(v)]);
  const predPts = predicted.map((v, i) => [px(i), py(v)]);

  const obsLine = observed.length
    ? `<polyline class="appx-reg-observed" points="${polyline(obsPts)}"/>`
    : "";
  const predLine = predicted.length
    ? `<polyline class="appx-reg-predicted" points="${polyline(predPts)}"/>`
    : "";

  // pisteet (optio)
  let dotsHtml = "";
  if (showDots) {
    obsPts.forEach(([x, y]) => { dotsHtml += `<circle class="appx-reg-dot-obs" cx="${x}" cy="${y}" r="3.5"/>`; });
    predPts.forEach(([x, y]) => { dotsHtml += `<circle class="appx-reg-dot-pred" cx="${x}" cy="${y}" r="3"/>`; });
  }

  // interaktiivinen kursorikohtisuora
  const svgId = "reg-" + Math.random().toString(36).slice(2);
  const cursor = `<line class="appx-reg-cursor" id="${svgId}-cur" x1="-999" y1="${pad.top}" x2="-999" y2="${pad.top + ih}" style="display:none"/>`;
  const hoverDot = `<circle class="appx-reg-hover-dot" id="${svgId}-hd" r="5" style="display:none"/>`;
  const tooltip = `<g class="appx-reg-tt" id="${svgId}-tt" style="display:none">
    <rect id="${svgId}-tt-bg" x="0" y="0" width="100" height="36" rx="4" ry="4"/>
    <text id="${svgId}-tt-t1" x="8" y="14"></text>
    <text id="${svgId}-tt-t2" x="8" y="27"></text>
  </g>`;

  const interactLayer = `<rect fill="transparent" x="${pad.left}" y="${pad.top}" width="${iw}" height="${ih}" id="${svgId}-layer"/>`;

  const script = `<script>(function(){
    var svg=document.getElementById('${svgId}');
    if(!svg)return;
    var layer=svg.querySelector('#${svgId}-layer');
    var cur=svg.querySelector('#${svgId}-cur');
    var hd=svg.querySelector('#${svgId}-hd');
    var tt=svg.querySelector('#${svgId}-tt');
    var ttBg=svg.querySelector('#${svgId}-tt-bg');
    var tt1=svg.querySelector('#${svgId}-tt-t1');
    var tt2=svg.querySelector('#${svgId}-tt-t2');
    var obs=${JSON.stringify(observed)};
    var pred=${JSON.stringify(predicted)};
    var lbls=${JSON.stringify(labels || [])};
    var n=${n};
    var padL=${pad.left}, padT=${pad.top}, iw=${iw}, ih=${ih};
    var W=${W};
    function getIdx(ex){
      var rect=svg.getBoundingClientRect();
      var scale=W/rect.width;
      var mx=(ex-rect.left)*scale;
      var frac=(mx-padL)/iw;
      return Math.max(0,Math.min(n-1,Math.round(frac*(n-1))));
    }
    layer.addEventListener('mousemove',function(e){
      var i=getIdx(e.clientX);
      var cx=padL+(i/(n-1))*iw;
      cur.setAttribute('x1',cx);cur.setAttribute('x2',cx);cur.style.display='';
      var ov=obs[i],pv=pred[i];
      var yv=ov!==undefined?ov:(pv!==undefined?pv:null);
      if(yv===null){hd.style.display='none';tt.style.display='none';return;}
      var ya=${ya},yb=${yb};
      var cy=padT+ih-((yv-ya)/(yb-ya))*ih;
      hd.setAttribute('cx',cx);hd.setAttribute('cy',cy);hd.style.display='';
      var lbl=lbls[i]!==undefined?String(lbls[i]):String(i+1);
      tt1.textContent=lbl+(ov!==undefined?' hav: '+ov.toPrecision(4):'');
      tt2.textContent=pv!==undefined?'enn: '+pv.toPrecision(4):'';
      var tw=Math.max(tt1.textContent.length,tt2.textContent.length)*6.5+16;
      var tx=cx+10,ty=padT+4;
      if(tx+tw>W-padT)tx=cx-tw-10;
      ttBg.setAttribute('x',tx);ttBg.setAttribute('y',ty);ttBg.setAttribute('width',tw);
      tt1.setAttribute('x',tx+8);tt1.setAttribute('y',ty+14);
      tt2.setAttribute('x',tx+8);tt2.setAttribute('y',ty+27);
      tt.style.display='';
    });
    layer.addEventListener('mouseleave',function(){
      cur.style.display='none';hd.style.display='none';tt.style.display='none';
    });
  })();<\/script>`;

  return `<svg class="appx-reg-svg" viewBox="0 0 ${W} ${H}" id="${svgId}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${xTickLabels}${axes}${axLabels}${band}${obsLine}${predLine}${dotsHtml}${cursor}${hoverDot}${tooltip}${interactLayer}
  </svg>`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const observed = (c.observed || []).map(Number).filter(isFinite);
  const predicted = (c.predicted || []).map(Number).filter(isFinite);

  // confidence: [{low,high}] tai [number] (±offset)
  const rawConf = c.confidence || [];
  const confidence = rawConf.map(v => {
    if (v && typeof v === "object") return { low: +v.low, high: +v.high };
    const pred = predicted[rawConf.indexOf(v)];
    return { low: pred - +v, high: pred + +v };
  });

  const labels = c.labels || c.x_labels || [];
  const xLabel = c.x_label || c.x_axis || "aika";
  const yLabel = c.y_label || c.y_axis || "arvo";
  const showDots = observed.length <= 40;

  const svgHtml = buildSvg(observed, predicted, confidence, labels, xLabel, yLabel, showDots);

  // tilastot
  const r = rmse(observed, predicted);
  const m = mae(observed, predicted);
  const r2 = c.r_squared !== undefined ? +c.r_squared : null;
  const statsHtml = (r !== null || r2 !== null) ? `<div class="appx-reg-stats">
    ${r2 !== null ? `<div class="appx-reg-stat">R² <b>${r2.toFixed(3)}</b></div>` : ""}
    ${r !== null ? `<div class="appx-reg-stat">RMSE <b>${r.toFixed(3)}</b></div>` : ""}
    ${m !== null ? `<div class="appx-reg-stat">MAE <b>${m.toFixed(3)}</b></div>` : ""}
    ${c.model ? `<div class="appx-reg-stat">malli <b>${esc(c.model)}</b></div>` : ""}
  </div>` : "";

  const legendHtml = `<div class="appx-reg-legend">
    <div class="appx-reg-legend-item"><div class="appx-reg-legend-line" style="background:var(--fg-soft,#3a332a)"></div>Havaittu</div>
    ${predicted.length ? `<div class="appx-reg-legend-item"><div class="appx-reg-legend-line" style="background:var(--accent,#1f1b15);opacity:.7"></div>Ennustettu</div>` : ""}
    ${confidence.length ? `<div class="appx-reg-legend-item"><div class="appx-reg-legend-line" style="background:var(--accent,#1f1b15);opacity:.3;height:8px;border-radius:2px"></div>Luottamusväli</div>` : ""}
  </div>`;

  const main = `<div class="appx-reg-wrap">${svgHtml}${statsHtml}${legendHtml}</div>`;
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}