// renderers/rekisterikartta.js -- rekisterikartta (lämpökartta): rivit × neljä lukurekisteriä.
// Käyttö: content.view = "rekisterikartta".
// content: { body?, rows:[{label, counts:{r1,r2,r3,r4}, unclassified?}], show_unclassified?, note?, source? }

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-rekisteri", `
    .appx .rk-wrap { overflow-x: auto; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); }
    .appx .rk-table { border-collapse: collapse; width: 100%; min-width: 520px; font-family: var(--sans, "Work Sans", sans-serif); }
    .appx .rk-table th, .appx .rk-table td { padding: 9px 10px; text-align: center; border-bottom: 1px solid var(--line, #e6dfd0); }
    .appx .rk-table thead th { font-weight: 500; font-size: 11px; color: var(--fg-soft, #3a332a); vertical-align: bottom; border-bottom: 2px solid var(--line-strong, #c9bfa9); }
    .appx .rk-th-num { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 18px; line-height: 1; }
    .appx .rk-th-name { display: block; margin-top: 2px; }
    .appx .rk-th-bar { height: 3px; border-radius: 2px; margin-top: 6px; }
    .appx .rk-row-label { text-align: left; font-size: 13px; color: var(--fg, #1f1b15); white-space: nowrap; }
    .appx .rk-cell { font-family: var(--mono, ui-monospace, monospace); font-size: 13px; color: var(--fg, #1f1b15); }
    .appx .rk-cell.zero { color: var(--muted-2, #8a8276); }
    .appx .rk-cell.peak { font-weight: 700; }
    .appx .rk-total { font-family: var(--mono, ui-monospace, monospace); font-size: 12px; color: var(--muted, #6b6356); background: var(--bg-soft, #f4efe5); }
    .appx .rk-table tfoot td { font-family: var(--mono, ui-monospace, monospace); font-size: 12px; color: var(--muted, #6b6356); border-top: 2px solid var(--line-strong, #c9bfa9); border-bottom: none; font-weight: 500; }
    .appx .rk-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; font-size: 11.5px; color: var(--muted, #6b6356); }
    .appx .rk-legend-item { display: inline-flex; align-items: baseline; gap: 6px; }
    .appx .rk-legend-num { font-weight: 600; }
    .appx .rk-legend-verbs { color: var(--muted-2, #8a8276); }
  `);
}

const REG = [
  { key: "r1", num: "1", name: "Näytä ilmiö",        verbs: "havainnollistaa · suhteuttaa · konkretisoi", color: "#9a6a3c" },
  { key: "r2", num: "2", name: "Paljasta mekanismi", verbs: "paljastaa · jäljittää",                      color: "#4a7a3c" },
  { key: "r3", num: "3", name: "Tulkitse",           verbs: "määritellä · haastaa",                       color: "#3a6ea5" },
  { key: "r4", num: "4", name: "Palauta valinta",    verbs: "vapauttaa",                                  color: "#7a5ea8" },
];
const GRAY = "#8a8276";

function rgba(hex, a) {
  const h = hex.replace("#", ""); const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function render(el, content, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const rows = (Array.isArray(content.rows) ? content.rows : []).map((r) => ({
    label: r.label || "",
    counts: REG.reduce((o, reg) => { o[reg.key] = Number((r.counts || {})[reg.key]) || 0; return o; }, {}),
    unclassified: Number(r.unclassified) || 0,
  }));
  if (!rows.length) { el.innerHTML = util.lead(content) + util.note(content) + util.source(content); return; }

  const hasU = content.show_unclassified !== false && rows.some((r) => r.unclassified > 0);
  let maxCell = 1, maxU = 1;
  rows.forEach((r) => { REG.forEach((reg) => { if (r.counts[reg.key] > maxCell) maxCell = r.counts[reg.key]; }); if (r.unclassified > maxU) maxU = r.unclassified; });

  const colTotals = REG.reduce((o, reg) => { o[reg.key] = rows.reduce((s, r) => s + r.counts[reg.key], 0); return o; }, {});
  const totU = rows.reduce((s, r) => s + r.unclassified, 0);
  const grand = REG.reduce((s, reg) => s + colTotals[reg.key], 0) + totU;

  const op = (v) => v === 0 ? 0 : 0.12 + 0.85 * (v / maxCell);
  const opU = (v) => v === 0 ? 0 : 0.12 + 0.85 * (v / maxU);

  let head = `<tr><th></th>`;
  REG.forEach((reg) => { head += `<th><span class="rk-th-num" style="color:${reg.color}">${reg.num}</span><span class="rk-th-name">${esc(reg.name)}</span><div class="rk-th-bar" style="background:${reg.color}"></div></th>`; });
  if (hasU) head += `<th><span class="rk-th-num" style="color:${GRAY}">–</span><span class="rk-th-name">Luokittelematta</span><div class="rk-th-bar" style="background:${GRAY}"></div></th>`;
  head += `<th class="rk-row-label" style="text-align:right">Yht.</th></tr>`;

  let body = "";
  rows.forEach((r) => {
    const peak = REG.reduce((best, reg) => r.counts[reg.key] > r.counts[best] ? reg.key : best, "r1");
    const peakVal = r.counts[peak];
    body += `<tr><td class="rk-row-label">${esc(r.label)}</td>`;
    REG.forEach((reg) => {
      const v = r.counts[reg.key];
      const isPeak = v > 0 && v === peakVal;
      body += `<td class="rk-cell${v === 0 ? " zero" : ""}${isPeak ? " peak" : ""}" style="background:${rgba(reg.color, op(v))}">${v}</td>`;
    });
    if (hasU) body += `<td class="rk-cell${r.unclassified === 0 ? " zero" : ""}" style="background:${rgba(GRAY, opU(r.unclassified))}">${r.unclassified || ""}</td>`;
    const rowTot = REG.reduce((s, reg) => s + r.counts[reg.key], 0) + r.unclassified;
    body += `<td class="rk-total">${rowTot}</td></tr>`;
  });

  let foot = `<tr><td class="rk-row-label">Yhteensä</td>`;
  REG.forEach((reg) => { foot += `<td>${colTotals[reg.key]}</td>`; });
  if (hasU) foot += `<td>${totU}</td>`;
  foot += `<td>${grand}</td></tr>`;

  const legend = `<div class="rk-legend">${REG.map((reg) => `<span class="rk-legend-item"><span class="rk-legend-num" style="color:${reg.color}">${reg.num}</span> ${esc(reg.name)} <span class="rk-legend-verbs">(${esc(reg.verbs)})</span></span>`).join("")}</div>`;

  el.innerHTML = util.lead(content) +
    `<div class="rk-wrap"><table class="rk-table"><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>` +
    legend + util.note(content) + util.source(content);
}