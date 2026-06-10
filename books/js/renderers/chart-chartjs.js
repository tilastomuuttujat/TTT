// renderers/chart-chartjs.js — Chart.js-kuvaajat. Asynkroninen: lataa kirjaston
// (loaderin loadLib) + annotation-pluginin, sitten piirtää canvasiin elementtiin.
// Sisältö: { kind:"raw", config } | { chart:{data,...} } | preset-fi-nordic (yearsFrom…series[])

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-chart", `
    .appx .app-chart-wrap { position: relative; width: 100%; margin: 12px 0; background: var(--card, #fff); border: 1px solid var(--line, #e6dfd0); border-radius: 8px; padding: 12px; }
  `);
}

let _annotationPromise = null;
function loadAnnotationOnce() {
  if (window.__chartAnnotationLoaded) return Promise.resolve();
  if (_annotationPromise) return _annotationPromise;
  _annotationPromise = new Promise((resolve) => {
    const a = document.createElement("script");
    a.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js";
    a.onload = () => { window.__chartAnnotationLoaded = true; resolve(); };
    a.onerror = () => resolve(); // jatka ilman annotation-pluginia
    document.head.appendChild(a);
  });
  return _annotationPromise;
}

function chartPalette() {
  const cs = getComputedStyle(document.documentElement);
  const tok = (n, fb) => { const v = cs.getPropertyValue(n).trim(); return v || fb; };
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    fi: tok("--accent", "#1f1b15"), nordic: tok("--muted", "#6b6356"),
    replacement: tok("--accent-soft", "#4a4034"), peer3: tok("--line-strong", "#c9bfa9"),
    crisis: tok("--accent-soft", "#4a4034"), grid: tok("--line", "#e6dfd0"), text: tok("--muted", "#6b6356"),
    tooltipBg: isDark ? "rgba(28,24,20,0.96)" : "rgba(31,27,21,0.92)",
    tooltipFg: isDark ? "#f1ebdd" : "#fdfbf7",
    tooltipBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.15)",
    annotationLine: isDark ? "rgba(161,154,143,0.55)" : "rgba(107,99,86,0.50)",
    annotationLabelBg: isDark ? "rgba(28,24,20,0.88)" : "rgba(253,251,247,0.92)",
    annotationLabelFg: isDark ? "#b4b2a9" : "#6b6356",
  };
}
function chartFormatter(kind) {
  if (kind === "percent") return (v) => v + " %";
  if (kind === "decimal") return (v) => Number(v).toFixed(1);
  return (v) => v;
}
function buildChartPreset(content) {
  const C = chartPalette();
  const from = Number(content.yearsFrom), to = Number(content.yearsTo), step = Number(content.yearsStep) || 2;
  const years = []; for (let y = from; y <= to; y += step) years.push(y);
  const yFmt = chartFormatter(content.yFmt);
  const datasets = (content.series || []).map((s) => {
    const color = s.color === "nordic" ? C.nordic : s.color === "crisis" ? C.crisis : s.color === "replacement" ? C.replacement : (typeof s.color === "string" && s.color.startsWith("#")) ? s.color : C.fi;
    const dataObj = s.data || {};
    const data = years.map((y) => dataObj[y] !== undefined ? dataObj[y] : null);
    return {
      label: s.label || "", data, borderColor: color,
      backgroundColor: content.chartType === "bar" ? color : "transparent",
      borderWidth: s.dashed ? 1.4 : (color === C.fi ? 2.2 : 1.6),
      borderDash: s.dashed ? [5, 4] : [], pointRadius: 0, pointHoverRadius: 3, tension: 0.25,
      ...(content.chartType === "bar" ? { borderRadius: 3, barPercentage: 0.7, categoryPercentage: 0.75 } : {}),
    };
  });
  const annotations = {};
  (content.crisisYears || []).forEach((y, i) => {
    const label = Array.isArray(content.crisisLabels) ? content.crisisLabels[i] : null;
    annotations["crisis_" + i] = {
      type: "line", xMin: y, xMax: y, borderColor: C.annotationLine, borderWidth: 1.5, borderDash: [4, 3],
      ...(label ? { label: { display: true, content: label, position: "start", yAdjust: 8 + i * 20, backgroundColor: C.annotationLabelBg, color: C.annotationLabelFg, font: { size: 10, weight: "500" }, padding: { x: 5, y: 3 }, cornerRadius: 3 } } : {}),
    };
  });
  const opts = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: content.showLegend !== false, labels: { color: C.text, font: { size: 11 } } },
      tooltip: { mode: "index", intersect: false, position: "nearest", backgroundColor: C.tooltipBg, titleColor: C.tooltipFg, bodyColor: C.tooltipFg, borderColor: C.tooltipBorder, borderWidth: 1, padding: { x: 12, y: 10 }, titleFont: { size: 11, weight: "600" }, bodyFont: { size: 12 }, cornerRadius: 8, caretSize: 5, callbacks: { title: (items) => "Vuosi " + items[0].label, label: (item) => item.dataset.label + ": " + yFmt(item.parsed.y) } },
      ...(Object.keys(annotations).length ? { annotation: { annotations } } : {}),
    },
    scales: {
      x: { type: content.chartType === "bar" ? "category" : "linear", ...(content.chartType === "bar" ? {} : { min: from, max: to }), ticks: { stepSize: content.xStep || 20, color: C.text, font: { size: 10 }, callback: content.chartType === "bar" ? undefined : (v) => String(Math.round(v)) }, grid: { color: C.grid, display: content.chartType !== "bar" } },
      y: { min: content.yMin ?? undefined, max: content.yMax ?? undefined, ticks: { color: C.text, font: { size: 10 }, callback: (v) => yFmt(v) }, grid: { color: C.grid }, title: content.yLabel ? { display: true, text: content.yLabel, color: C.text, font: { size: 10 } } : { display: false } },
    },
  };
  return { type: content.chartType || "line", data: { labels: years, datasets }, options: opts };
}
function colorizeDatasets(config) {
  const C = chartPalette();
  if (!config || !config.data || !Array.isArray(config.data.datasets)) return config;
  const fb = [C.nordic, C.replacement, C.peer3]; let i = 0;
  config.data.datasets.forEach((ds) => {
    const label = (ds.label || "").toLowerCase();
    const isFinland = label.includes("suomi") || label.includes("finland");
    if (ds.borderColor === undefined) ds.borderColor = isFinland ? C.fi : fb[i++ % fb.length];
    if (ds.backgroundColor === undefined) ds.backgroundColor = (config.type === "bar") ? ds.borderColor : "transparent";
    if (ds.borderWidth === undefined) ds.borderWidth = isFinland ? 2.0 : 1.5;
    if (ds.pointRadius === undefined) ds.pointRadius = 0;
    if (ds.pointHoverRadius === undefined) ds.pointHoverRadius = 3;
    if (ds.tension === undefined && config.type !== "bar") ds.tension = 0.25;
  });
  return config;
}
function applyChartTheme(config) {
  const C = chartPalette();
  config.options = config.options || {};
  const o = config.options;
  if (o.responsive === undefined) o.responsive = true;
  if (o.maintainAspectRatio === undefined) o.maintainAspectRatio = false;
  if (!o.interaction) o.interaction = { mode: "index", intersect: false };
  o.plugins = o.plugins || {};
  o.plugins.legend = o.plugins.legend || {};
  o.plugins.legend.labels = Object.assign({ color: C.text, font: { size: 11 } }, o.plugins.legend.labels || {});
  o.plugins.tooltip = Object.assign({ mode: "index", intersect: false, position: "nearest", backgroundColor: C.tooltipBg, titleColor: C.tooltipFg, bodyColor: C.tooltipFg, borderColor: C.tooltipBorder, borderWidth: 1, padding: { x: 12, y: 10 }, titleFont: { size: 11, weight: "600" }, bodyFont: { size: 12 }, cornerRadius: 8, caretSize: 5 }, o.plugins.tooltip || {});
  o.scales = o.scales || {};
  ["x", "y"].forEach((ax) => {
    o.scales[ax] = o.scales[ax] || {};
    o.scales[ax].ticks = Object.assign({ color: C.text, font: { size: 10 } }, o.scales[ax].ticks || {});
    o.scales[ax].grid = Object.assign({ color: C.grid }, o.scales[ax].grid || {});
    if (o.scales[ax].title) o.scales[ax].title = Object.assign({ color: C.text, font: { size: 10 } }, o.scales[ax].title);
  });
  if (o.plugins.annotation && o.plugins.annotation.annotations) {
    Object.values(o.plugins.annotation.annotations).forEach((ann) => {
      if (!ann || typeof ann !== "object") return;
      if (ann.borderColor === undefined) ann.borderColor = C.annotationLine;
      if (ann.borderWidth === undefined) ann.borderWidth = 1.5;
      if (ann.label && typeof ann.label === "object") {
        const lbl = ann.label;
        if (lbl.backgroundColor === undefined) lbl.backgroundColor = C.annotationLabelBg;
        if (lbl.color === undefined) lbl.color = C.annotationLabelFg;
        if (lbl.font === undefined) lbl.font = { size: 10, weight: "500" };
        if (lbl.padding === undefined) lbl.padding = { x: 5, y: 3 };
        if (lbl.cornerRadius === undefined) lbl.cornerRadius = 3;
      }
    });
  }
  return config;
}

export async function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const height = Number(c.height) || 360;
  el.innerHTML = util.lead(c) + util.note(c)
    + `<div class="app-chart-wrap" style="height:${height}px"><canvas></canvas></div>`
    + util.extras(c) + util.source(c);
  const canvasEl = el.querySelector(".app-chart-wrap canvas");
  if (!canvasEl) return;
  try {
    await util.loadLib("chartjs");
    await loadAnnotationOnce();
    let config;
    if (c.kind === "raw" && c.config) config = c.config;
    else if (c.chart && c.chart.data) config = applyChartTheme(colorizeDatasets(c.chart));
    else config = buildChartPreset(c);
    const chartInstance = new Chart(canvasEl, config);
    const wrap = canvasEl.parentElement;
    if (wrap) {
      wrap.addEventListener("touchstart", (e) => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false });
      wrap.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          const touch = e.touches[0];
          chartInstance.canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: touch.clientX, clientY: touch.clientY, bubbles: true }));
        }
      }, { passive: false });
      wrap.addEventListener("touchend", () => { setTimeout(() => { chartInstance.canvas.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })); }, 1800); }, { passive: true });
    }
  } catch (err) {
    const w = el.querySelector(".app-chart-wrap");
    if (w) w.outerHTML = `<div class="appx-note">Kuvaajaa ei voitu piirtää: ${esc(err && err.message)}</div>`;
  }
}
