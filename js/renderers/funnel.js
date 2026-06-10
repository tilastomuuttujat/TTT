// renderers/funnel.js -- suppilokaavio, pudotukset vaiheittain.
// Skeemat: stages[] {label, value, desc?}  unit?  base_label?
//          Vaihtoehtoisesti: steps[] {name|label, n|value|count, note?}

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-funnel", `
    .appx-funnel-wrap { margin: 14px 0 0; }
    .appx-funnel-svg { width: 100%; height: auto; display: block; overflow: visible; }
    .appx-funnel-bar { rx: 4; ry: 4; transition: opacity .12s; cursor: default; }
    .appx-funnel-bar:hover { opacity: .82; }
    .appx-funnel-label { font-size: 13px; fill: var(--fg, #1f1b15); font-family: "Instrument Serif", Georgia, serif; dominant-baseline: middle; }
    .appx-funnel-value { font-size: 12px; fill: var(--fg-soft, #3a332a); font-family: "Work Sans", system-ui, sans-serif; dominant-baseline: middle; font-weight: 600; }
    .appx-funnel-pct { font-size: 11px; fill: var(--muted-2, #8a8276); font-family: "Work Sans", system-ui, sans-serif; dominant-baseline: middle; }
    .appx-funnel-drop { font-size: 11px; fill: var(--danger, #a3271a); font-family: "Work Sans", system-ui, sans-serif; dominant-baseline: middle; }
    .appx-funnel-connector { fill: var(--accent, #1f1b15); opacity: .06; }
    .appx-funnel-axis { stroke: var(--line, #e6dfd0); stroke-width: 1; }
    .appx-funnel-desc { font-size: 12px; fill: var(--muted, #6b6356); font-family: "Work Sans", system-ui, sans-serif; }
    .appx-funnel-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .appx-funnel-stat { font-size: 12px; color: var(--muted-2, #8a8276); background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 6px; padding: 4px 10px; }
    .appx-funnel-stat b { color: var(--fg, #1f1b15); font-weight: 600; }
    .appx-funnel-drop-list { margin-top: 10px; display: grid; gap: 6px; }
    .appx-funnel-drop-item { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; line-height: 1.5; color: var(--muted, #6b6356); border-left: 2px solid var(--line-strong, #c9bfa9); padding-left: 10px; }
    .appx-funnel-drop-item.big { border-left-color: var(--danger, #a3271a); color: var(--fg-soft, #3a332a); }
    .appx-funnel-drop-item b { color: var(--danger, #a3271a); font-weight: 600; white-space: nowrap; }
  `);
}

function buildSvg(stages, unit, svgId) {
  const n = stages.length;
  if (!n) return "<p style='color:var(--muted)'>Ei vaiheita.</p>";

  const W = 520;
  const barH = 36;
  const gap = 14;
  const labelW = Math.max(100, Math.max(...stages.map(s => (s.label || "").length)) * 7 + 12);
  const metaW = 110; // arvo + %
  const barAreaW = W - labelW - metaW - 8;
  const H = n * (barH + gap) + gap;

  const maxVal = stages[0].value; // suppilo: ensimmäinen on suurin
  const barColor = "var(--accent,#1f1b15)";

  let bars = "", connectors = "", labels = "", metas = "";

  stages.forEach((s, i) => {
    const t = maxVal > 0 ? s.value / maxVal : 0;
    const bw = Math.max(4, t * barAreaW);
    const bx = labelW + (barAreaW - bw) / 2; // keskitetty
    const by = gap + i * (barH + gap);

    // suppiloyhdistin edelliseen
    if (i > 0) {
      const prevT = maxVal > 0 ? stages[i - 1].value / maxVal : 0;
      const prevBw = Math.max(4, prevT * barAreaW);
      const prevBx = labelW + (barAreaW - prevBw) / 2;
      const prevBy = gap + (i - 1) * (barH + gap);
      connectors += `<polygon class="appx-funnel-connector" points="${prevBx},${prevBy + barH} ${prevBx + prevBw},${prevBy + barH} ${bx + bw},${by} ${bx},${by}"/>`;
    }

    // väri tummenee alaspäin (vaihe 0 = täysi, viimeinen = tummin)
    const opacity = 0.45 + 0.55 * (i / Math.max(n - 1, 1));
    bars += `<rect class="appx-funnel-bar" x="${bx}" y="${by}" width="${bw}" height="${barH}" fill="${barColor}" opacity="${opacity.toFixed(2)}"/>`;

    // otsikko vasemmalla
    labels += `<text class="appx-funnel-label" x="${labelW - 8}" y="${by + barH / 2}" text-anchor="end">${s.label || ""}</text>`;

    // arvo + % oikealla
    const pctOfTop = maxVal > 0 ? (s.value / maxVal * 100) : 100;
    const valStr = Number.isInteger(s.value) ? String(s.value) : s.value.toPrecision(4);
    metas += `<text class="appx-funnel-value" x="${labelW + barAreaW + 8}" y="${by + barH / 2 - 6}">${valStr}${unit ? " " + unit : ""}</text>`;
    metas += `<text class="appx-funnel-pct" x="${labelW + barAreaW + 8}" y="${by + barH / 2 + 8}">${pctOfTop.toFixed(1)} %</text>`;

    // pudotus edellisestä (paitsi ensimmäinen)
    if (i > 0) {
      const drop = stages[i - 1].value - s.value;
      const dropPct = stages[i - 1].value > 0 ? (drop / stages[i - 1].value * 100) : 0;
      const midY = gap + (i - 0.5) * (barH + gap) + barH / 2 - 6;
      metas += `<text class="appx-funnel-drop" x="${labelW + barAreaW + 8}" y="${midY}">−${dropPct.toFixed(0)} %</text>`;
    }
  });

  return `<svg class="appx-funnel-svg" viewBox="0 0 ${W} ${H}" id="${svgId}" xmlns="http://www.w3.org/2000/svg">
    ${connectors}${bars}${labels}${metas}
  </svg>`;
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  // normalisoi vaiheet
  let stages = [];
  const raw = c.stages || c.steps || c.funnel || [];
  if (Array.isArray(raw)) {
    stages = raw.map(s => ({
      label: String(s.label || s.name || s.otsikko || s.vaihe || ""),
      value: +(s.value || s.n || s.count || s.arvo || 0),
      desc: s.desc || s.note || s.kuvaus || "",
    })).filter(s => s.value > 0);
  }

  if (!stages.length) {
    el.innerHTML = util.lead(c) + `<div class="appx-note">Ei vaihedata.</div>` + util.source(c);
    return;
  }

  // järjestä laskevasti jos ei jo
  if (stages[0].value < stages[stages.length - 1].value) {
    stages = [...stages].reverse();
  }

  const unit = c.unit || "";
  const svgId = "funnel-" + Math.random().toString(36).slice(2);
  const svgHtml = buildSvg(stages, unit, svgId);

  // kokonaiskonversio alusta loppuun
  const totalConv = stages[0].value > 0 ? (stages[stages.length - 1].value / stages[0].value * 100) : 0;

  // suurin pudotus
  let bigDropIdx = -1, bigDropPct = 0;
  for (let i = 1; i < stages.length; i++) {
    const dp = stages[i - 1].value > 0 ? (stages[i - 1].value - stages[i].value) / stages[i - 1].value * 100 : 0;
    if (dp > bigDropPct) { bigDropPct = dp; bigDropIdx = i; }
  }

  const statsHtml = `<div class="appx-funnel-stats">
    <div class="appx-funnel-stat">läpäisy alusta loppuun <b>${totalConv.toFixed(1)} %</b></div>
    <div class="appx-funnel-stat">vaiheita <b>${stages.length}</b></div>
    ${bigDropIdx > 0 ? `<div class="appx-funnel-stat">suurin pudotus <b>${esc(stages[bigDropIdx].label)} (−${bigDropPct.toFixed(0)} %)</b></div>` : ""}
  </div>`;

  // pudotusselitteet desc-kentistä
  const dropList = stages.filter(s => s.desc).length
    ? `<div class="appx-funnel-drop-list">${stages.map((s, i) => {
        if (!s.desc) return "";
        const dp = i > 0 && stages[i - 1].value > 0
          ? (stages[i - 1].value - s.value) / stages[i - 1].value * 100
          : 0;
        const big = dp > 30;
        return `<div class="appx-funnel-drop-item${big ? " big" : ""}">
          <b>${i > 0 ? "−" + dp.toFixed(0) + "%" : "↓"}</b>
          <span><b>${esc(s.label)}</b> -- ${esc(s.desc)}</span>
        </div>`;
      }).join("")}</div>` : "";

  const main = `<div class="appx-funnel-wrap">${svgHtml}${statsHtml}${dropList}</div>`;
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}