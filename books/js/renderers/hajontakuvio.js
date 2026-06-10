// renderers/hajontakuvio.js -- hajontakuvio + pienimmän neliösumman suora, r ja R².
// Käyttö: content.view = "hajontakuvio".
// content: { body?, x:{label,min?,max?}, y:{label,min?,max?}, points:[{x,y,group?,label?}],
//            groups?:{ "Nimi":"#hex", ... }, fit?:bool, note?, source? }

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-hajonta", `
    .appx .hk-wrap { width: 100%; max-width: 640px; margin: 4px auto 0; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); padding: 6px 6px 12px; }
    .appx .hk-svg { width: 100%; height: auto; display: block; }
    .appx .hk-dot { transition: opacity .15s; cursor: pointer; }
    .appx .hk-dim { opacity: 0.12 !important; }
    .appx .hk-legend { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 8px 8px 0; }
    .appx .hk-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 11px; border: 1px solid var(--line, #e6dfd0); border-radius: 20px; background: var(--bg-soft, #f4efe5); color: var(--fg-soft, #3a332a); cursor: pointer; transition: .15s; }
    .appx .hk-chip:hover { border-color: var(--line-strong, #c9bfa9); }
    .appx .hk-chip.on { border-color: currentColor; background: var(--card, #fff); }
    .appx .hk-cdot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .appx .hk-readout { text-align: center; font-size: 12.5px; color: var(--muted, #6b6356); margin: 9px 10px 0; min-height: 18px; }
  `);
}

const PAL = ["#3a6ea5", "#9a8a2a", "#1f6f6b", "#a3503a", "#7a5ea8", "#4a7a3c"];

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;
  const pts = (Array.isArray(c.points) ? c.points : [])
    .map((p) => ({ x: Number(p.x), y: Number(p.y), group: p.group || "", label: p.label || "" }))
    .filter((p) => isFinite(p.x) && isFinite(p.y));
  if (pts.length < 2) { el.innerHTML = util.lead(c) + util.note(c) + util.source(c); return; }

  const X = c.x || {}, Y = c.y || {};
  const ext = (sel, lo, hi) => { let a = Infinity, b = -Infinity; pts.forEach((p) => { const v = sel(p); if (v < a) a = v; if (v > b) b = v; }); const pad = (b - a) * 0.06 || 1; return [lo != null ? lo : a - pad, hi != null ? hi : b + pad]; };
  const [xmin, xmax] = ext((p) => p.x, X.min, X.max);
  const [ymin, ymax] = ext((p) => p.y, Y.min, Y.max);

  const groupsMap = c.groups && typeof c.groups === "object" ? c.groups : null;
  const groupNames = [...new Set(pts.map((p) => p.group).filter(Boolean))];
  const colorOf = (g) => groupsMap && groupsMap[g] ? groupsMap[g] : (g ? PAL[groupNames.indexOf(g) % PAL.length] : "#6b6356");

  // pienimmän neliösumman sovitus + r
  let fit = null;
  if (c.fit !== false) {
    const n = pts.length; let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
    pts.forEach((p) => { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; syy += p.y * p.y; });
    const mx = sx / n, my = sy / n;
    const ssxy = sxy - n * mx * my, ssxx = sxx - n * mx * mx, ssyy = syy - n * my * my;
    if (ssxx > 0 && ssyy > 0) {
      const slope = ssxy / ssxx, intercept = my - slope * mx, r = ssxy / Math.sqrt(ssxx * ssyy);
      fit = { slope, intercept, r, r2: r * r, n };
    }
  }

  const W = 640, H = 470, PADL = 58, PADR = 16, PADT = 18, PADB = 50;
  const plotW = W - PADL - PADR, plotH = H - PADT - PADB;
  const sx = (x) => PADL + (x - xmin) / (xmax - xmin) * plotW;
  const sy = (y) => (H - PADB) - (y - ymin) / (ymax - ymin) * plotH;
  const css = getComputedStyle(document.documentElement);
  const col = (n, fb) => (css.getPropertyValue(n).trim() || fb);
  const cLine = col("--line", "#e6dfd0"), cMut = col("--muted-2", "#8a8276"), cFg = col("--fg-soft", "#3a332a"), cCard = col("--card", "#fff"), sans = col("--sans", "Work Sans,sans-serif"), serif = col("--serif", "Instrument Serif,serif");
  const fmt = (v, span) => span < 5 ? (Math.round(v * 10) / 10).toLocaleString("fi-FI") : Math.round(v).toLocaleString("fi-FI");
  const uid = "hk" + Math.random().toString(36).slice(2, 8);

  let s = `<defs><clipPath id="${uid}"><rect x="${PADL}" y="${PADT}" width="${plotW}" height="${plotH}"/></clipPath></defs>`;
  // ruudukko + tikit
  const xspan = xmax - xmin, yspan = ymax - ymin;
  for (let i = 0; i <= 4; i++) {
    const xv = xmin + xspan * i / 4, xx = sx(xv);
    s += `<line x1="${xx.toFixed(1)}" y1="${PADT}" x2="${xx.toFixed(1)}" y2="${H - PADB}" stroke="${cLine}" stroke-width="1"/>`;
    s += `<text x="${xx.toFixed(1)}" y="${H - PADB + 16}" text-anchor="middle" fill="${cMut}" font-family="${sans}" font-size="10">${fmt(xv, xspan)}</text>`;
    const yv = ymin + yspan * i / 4, yy = sy(yv);
    s += `<line x1="${PADL}" y1="${yy.toFixed(1)}" x2="${W - PADR}" y2="${yy.toFixed(1)}" stroke="${cLine}" stroke-width="1"/>`;
    s += `<text x="${PADL - 6}" y="${(yy + 3).toFixed(1)}" text-anchor="end" fill="${cMut}" font-family="${sans}" font-size="10">${fmt(yv, yspan)}</text>`;
  }
  // akselien nimet
  if (X.label) s += `<text x="${PADL + plotW / 2}" y="${H - 8}" text-anchor="middle" fill="${cFg}" font-family="${serif}" font-size="14">${esc(X.label)}</text>`;
  if (Y.label) s += `<text transform="translate(15,${PADT + plotH / 2}) rotate(-90)" text-anchor="middle" fill="${cFg}" font-family="${serif}" font-size="14">${esc(Y.label)}</text>`;
  // sovitettu suora (leikattu plot-alueeseen)
  if (fit) {
    const y1 = fit.slope * xmin + fit.intercept, y2 = fit.slope * xmax + fit.intercept;
    s += `<line clip-path="url(#${uid})" x1="${sx(xmin).toFixed(1)}" y1="${sy(y1).toFixed(1)}" x2="${sx(xmax).toFixed(1)}" y2="${sy(y2).toFixed(1)}" stroke="${cFg}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.7"/>`;
    const rTxt = fit.r.toLocaleString("fi-FI", { maximumFractionDigits: 2 });
    const r2Txt = fit.r2.toLocaleString("fi-FI", { maximumFractionDigits: 2 });
    s += `<text x="${W - PADR}" y="${PADT + 12}" text-anchor="end" fill="${cFg}" font-family="${sans}" font-size="11" font-weight="500">r = ${rTxt} · R² = ${r2Txt} · n = ${fit.n}</text>`;
  }
  // pisteet
  pts.forEach((p, i) => {
    s += `<circle class="hk-dot" data-i="${i}" data-g="${esc(p.group)}" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="${colorOf(p.group)}" fill-opacity="0.72" stroke="${cCard}" stroke-width="0.6"/>`;
  });

  const legend = groupNames.length ? `<div class="hk-legend">${groupNames.map((g) => `<button class="hk-chip" data-g="${esc(g)}" style="color:${colorOf(g)}"><span class="hk-cdot" style="background:${colorOf(g)}"></span>${esc(g)}</button>`).join("")}</div>` : "";

  el.innerHTML = util.lead(c) +
    `<div class="hk-wrap"><svg class="hk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hajontakuvio"></svg>${legend}<div class="hk-readout">Osoita pistettä tai valitse ryhmä.</div></div>` +
    util.note(c) + util.source(c);

  const wrap = el.querySelector(".hk-wrap");
  const svgEl = wrap.querySelector(".hk-svg");
  svgEl.innerHTML = s;
  const readout = wrap.querySelector(".hk-readout");
  const dots = Array.from(svgEl.querySelectorAll(".hk-dot"));
  let activeG = null;
  function applyDim() { dots.forEach((d) => d.classList.toggle("hk-dim", activeG !== null && d.dataset.g !== activeG)); }
  function ptText(p) { return `${p.label ? esc(p.label) + " · " : ""}${esc(X.label || "x")} ${p.x.toLocaleString("fi-FI")} · ${esc(Y.label || "y")} ${p.y.toLocaleString("fi-FI")}`; }
  svgEl.addEventListener("mouseover", (e) => { const d = e.target.closest(".hk-dot"); if (d) readout.innerHTML = ptText(pts[+d.dataset.i]); });
  svgEl.addEventListener("mouseout", (e) => { const d = e.target.closest(".hk-dot"); if (d) readout.textContent = activeG ? activeG : "Osoita pistettä tai valitse ryhmä."; });
  wrap.querySelectorAll(".hk-chip").forEach((ch) => ch.addEventListener("click", () => {
    const g = ch.dataset.g; activeG = activeG === g ? null : g;
    wrap.querySelectorAll(".hk-chip").forEach((x) => x.classList.toggle("on", activeG !== null && x.dataset.g === activeG));
    applyDim(); readout.textContent = activeG ? activeG : "Osoita pistettä tai valitse ryhmä.";
  }));
}