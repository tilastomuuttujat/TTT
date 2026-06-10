// renderers/heatmap.js -- kaksiulotteinen lämpökartta.
// Skeemat: rows[] {label, values[]}  col_labels[]  unit?  palette?
//          Vaihtoehtoisesti: matrix[][] (pelkkä numeromatriisi) + row_labels[] + col_labels[]

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-heatmap", `
    .appx-hm-wrap { margin: 14px 0 0; overflow-x: auto; }
    .appx-hm-svg { display: block; overflow: visible; }
    .appx-hm-cell { rx: 3; ry: 3; transition: opacity .12s; cursor: default; }
    .appx-hm-cell:hover { opacity: .82; }
    .appx-hm-label-row { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-hm-label-col { font-size: 11px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-hm-cell-text { font-size: 10px; font-family: "Work Sans", system-ui, sans-serif; pointer-events: none; dominant-baseline: middle; text-anchor: middle; }
    .appx-hm-legend-wrap { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
    .appx-hm-legend-label { font-size: 11px; color: var(--muted-2, #8a8276); }
    .appx-hm-legend-svg { display: block; }
    .appx-hm-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .appx-hm-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 4px 10px; }
    .appx-hm-stat b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-hm-tt { pointer-events: none; }
    .appx-hm-tt rect { fill: var(--card, #fff); stroke: var(--line-strong, #c9bfa9); }
    .appx-hm-tt text { font-size: 11px; fill: var(--fg-soft, #3a332a); font-family: "Work Sans", system-ui, sans-serif; }
  `);
}

// Väripaletti: light → dark (accent-pohjainen, dark-mode-turvallinen CSS-muuttujilla)
// Palautetaan interpoloitu hex joka sopii SVG fill-arvoksi
function paletteColor(t, palette) {
  // t = 0..1
  const clamp = x => Math.max(0, Math.min(1, x));
  t = clamp(t);

  const palettes = {
    // tummuus kasvaa sinertävästä tummaan (neutraali, toimii dark/light)
    default: [
      [244, 239, 229], // --bg-soft light
      [180, 165, 140],
      [120, 105,  80],
      [ 74,  64,  52], // --accent-soft
      [ 31,  27,  21], // --accent
    ],
    // punainen → hälytys
    danger: [
      [253, 246, 244],
      [230, 180, 170],
      [200, 110,  95],
      [163,  39,  26],
      [100,  20,  10],
    ],
    // sininen → neutraali indikaattori
    blue: [
      [235, 242, 252],
      [175, 200, 235],
      [100, 145, 210],
      [ 45,  95, 175],
      [ 20,  50, 120],
    ],
    // vihreä → positiivinen
    green: [
      [236, 248, 236],
      [170, 218, 170],
      [ 95, 175,  95],
      [ 40, 120,  40],
      [ 15,  70,  15],
    ],
  };

  const stops = palettes[palette] || palettes.default;
  const seg = t * (stops.length - 1);
  const lo = Math.floor(seg), hi = Math.ceil(seg);
  const frac = seg - lo;
  const [r1, g1, b1] = stops[lo];
  const [r2, g2, b2] = stops[Math.min(hi, stops.length - 1)];
  const r = Math.round(r1 + (r2 - r1) * frac);
  const g = Math.round(g1 + (g2 - g1) * frac);
  const b = Math.round(b1 + (b2 - b1) * frac);
  return `rgb(${r},${g},${b})`;
}

function buildSvg(rows, colLabels, unit, palette, showValues, svgId) {
  const nRows = rows.length;
  const nCols = Math.max(...rows.map(r => r.values.length));
  if (!nRows || !nCols) return "<p style='color:var(--muted)'>Ei dataa.</p>";

  // Solukoko
  const rowLabelW = Math.max(80, Math.max(...rows.map(r => (r.label || "").length)) * 6.5 + 10);
  const colLabelH = 36;
  const cellW = Math.max(32, Math.min(60, Math.floor((520 - rowLabelW) / nCols)));
  const cellH = Math.max(22, Math.min(40, Math.floor(220 / nRows)));
  const legendH = 20;
  const W = rowLabelW + nCols * cellW + 2;
  const H = colLabelH + nRows * cellH + legendH + 20;

  // arvojen min/max
  const allVals = rows.flatMap(r => r.values).filter(v => v !== null && v !== undefined && isFinite(+v));
  const vMin = Math.min(...allVals), vMax = Math.max(...allVals);
  const vRange = vMax - vMin || 1;
  const norm = v => (v - vMin) / vRange;

  // sarakkeiden otsikot
  let colLabelsHtml = "";
  for (let ci = 0; ci < nCols; ci++) {
    const x = rowLabelW + ci * cellW + cellW / 2;
    const lbl = (colLabels && colLabels[ci]) ? String(colLabels[ci]) : String(ci + 1);
    colLabelsHtml += `<text class="appx-hm-label-col" x="${x}" y="${colLabelH - 6}" text-anchor="middle">${lbl}</text>`;
  }

  // solut + rivimerkit
  let cells = "", rowLabelsHtml = "", tooltips = "";
  rows.forEach((row, ri) => {
    const y = colLabelH + ri * cellH;
    rowLabelsHtml += `<text class="appx-hm-label-row" x="${rowLabelW - 6}" y="${y + cellH / 2 + 4}" text-anchor="end">${row.label || ""}</text>`;

    row.values.forEach((v, ci) => {
      if (v === null || v === undefined || !isFinite(+v)) return;
      const x = rowLabelW + ci * cellW;
      const t = norm(+v);
      const fill = paletteColor(t, palette);
      const textFill = t > 0.55 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";
      const tid = `${svgId}-tt-${ri}-${ci}`;
      const valStr = Number.isInteger(+v) ? String(+v) : (+v).toPrecision(3);
      const dispVal = showValues ? `<text class="appx-hm-cell-text" x="${x + cellW / 2}" y="${y + cellH / 2}" fill="${textFill}">${valStr}${unit ? unit : ""}</text>` : "";

      cells += `<rect class="appx-hm-cell" x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${fill}" data-tt="${tid}"/>`;
      cells += dispVal;

      const colLbl = (colLabels && colLabels[ci]) ? String(colLabels[ci]) : String(ci + 1);
      const ttText = `${row.label || ""} · ${colLbl}: ${valStr}${unit ? " " + unit : ""}`;
      const tw = ttText.length * 6.5 + 16;
      tooltips += `<g class="appx-hm-tt" id="${tid}" style="display:none">
        <rect x="0" y="0" width="${tw}" height="20" rx="4" ry="4"/>
        <text x="8" y="13">${ttText}</text>
      </g>`;
    });
  });

  // legenda
  const legW = Math.min(160, nCols * cellW);
  const legX = rowLabelW;
  const legY = colLabelH + nRows * cellH + 8;
  let legGrad = "";
  const legSteps = 20;
  for (let i = 0; i < legSteps; i++) {
    legGrad += `<rect x="${legX + i * legW / legSteps}" y="${legY}" width="${legW / legSteps + 1}" height="${legendH - 4}" fill="${paletteColor(i / (legSteps - 1), palette)}"/>`;
  }
  const legLabels = `
    <text class="appx-hm-label-col" x="${legX}" y="${legY + legendH + 2}" text-anchor="start">${+vMin.toPrecision(3)}</text>
    <text class="appx-hm-label-col" x="${legX + legW}" y="${legY + legendH + 2}" text-anchor="end">${+vMax.toPrecision(3)}</text>`;

  // tooltip-interaktio
  const script = `<script>(function(){
    var svg=document.getElementById('${svgId}');
    if(!svg)return;
    svg.querySelectorAll('.appx-hm-cell').forEach(function(cell){
      var tid=cell.getAttribute('data-tt');
      var tt=tid?svg.querySelector('#'+tid):null;
      if(!tt)return;
      cell.addEventListener('mouseenter',function(e){
        var r=svg.getBoundingClientRect();
        var scale=${W}/r.width;
        var mx=(e.clientX-r.left)*scale;
        var my=(e.clientY-r.top)*scale;
        var tw=parseFloat(tt.querySelector('rect').getAttribute('width'));
        var tx=mx+10; if(tx+tw>${W}-4) tx=mx-tw-10;
        var ty=my-24; if(ty<2) ty=my+8;
        tt.setAttribute('transform','translate('+tx+','+ty+')');
        tt.style.display='';
      });
      cell.addEventListener('mouseleave',function(){tt.style.display='none';});
    });
  })();<\/script>`;

  return `<svg class="appx-hm-svg" viewBox="0 0 ${W} ${H}" width="${W}" id="${svgId}" xmlns="http://www.w3.org/2000/svg">
    ${colLabelsHtml}${rowLabelsHtml}${cells}${legGrad}${legLabels}${tooltips}
  </svg>${script}`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  // normalisoi data
  let rows = [];
  if (Array.isArray(c.rows) && c.rows.length) {
    rows = c.rows.map(r => ({
      label: String(r.label || r.name || r.otsikko || ""),
      values: (r.values || r.data || []).map(v => v === null || v === undefined ? null : +v),
    }));
  } else if (Array.isArray(c.matrix) && c.matrix.length) {
    rows = c.matrix.map((vals, i) => ({
      label: (c.row_labels && c.row_labels[i]) ? String(c.row_labels[i]) : String(i + 1),
      values: vals.map(v => v === null ? null : +v),
    }));
  }

  const colLabels = c.col_labels || c.x_labels || c.labels || [];
  const unit = c.unit || "";
  const palette = c.palette || "default";
  const showValues = c.show_values !== false && rows.length <= 12 && (rows[0] && rows[0].values.length <= 16);

  const svgId = "hm-" + Math.random().toString(36).slice(2);
  const svgHtml = buildSvg(rows, colLabels, unit, palette, showValues, svgId);

  // tilastot
  const allVals = rows.flatMap(r => r.values).filter(v => v !== null && isFinite(v));
  const vMin = Math.min(...allVals), vMax = Math.max(...allVals);
  const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;

  // rivimaksimit (korkein soluarvo per rivi)
  const rowPeaks = rows.map(r => {
    const max = Math.max(...r.values.filter(v => v !== null && isFinite(v)));
    return { label: r.label, max };
  }).sort((a, b) => b.max - a.max);

  const statsHtml = `<div class="appx-hm-stats">
    <div class="appx-hm-stat">min <b>${+vMin.toPrecision(4)}${unit}</b></div>
    <div class="appx-hm-stat">max <b>${+vMax.toPrecision(4)}${unit}</b></div>
    <div class="appx-hm-stat">ka <b>${+mean.toPrecision(4)}${unit}</b></div>
    ${rowPeaks[0] ? `<div class="appx-hm-stat">korkein rivi <b>${esc(rowPeaks[0].label)}</b></div>` : ""}
  </div>`;

  const main = `<div class="appx-hm-wrap">${svgHtml}${statsHtml}</div>`;
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}