// renderers/sector.js — tilaa jakava ruudukko (nelikenttä).
// Skeemat: sectors[] {sector|name|title, description|desc|kuvaus, risk?, score?}

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-sector", `
    .appx-sector-grid { display: grid; gap: 10px; margin: 14px 0 0; grid-template-columns: repeat(2, 1fr); }
    .appx-sector-grid.cols1 { grid-template-columns: 1fr; }
    .appx-sector-grid.cols3 { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 560px) { .appx-sector-grid, .appx-sector-grid.cols3 { grid-template-columns: 1fr; } }
    .appx-sector { border: 1px solid var(--line, #e6dfd0); border-radius: 10px; background: var(--bg-soft, #f4efe5); padding: 12px 14px; position: relative; }
    .appx-sector-name { font-family: "Instrument Serif", Georgia, serif; font-size: 17px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 5px; padding-right: 44px; }
    .appx-sector-desc { font-size: 13.5px; line-height: 1.5; color: var(--muted, #6b6356); }
    .appx-sector-risk { font-size: 12.5px; line-height: 1.5; color: var(--muted-2, #8a8276); margin-top: 8px; }
    .appx-sector-risk b { color: var(--fg-soft, #3a332a); font-weight: 600; }
    .appx-sector-tag { position: absolute; top: 12px; right: 12px; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: var(--card, #fff); border: 1px solid var(--line, #e6dfd0); color: var(--muted-2, #8a8276); }
  `);
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  let arr = Array.isArray(c.sectors) ? c.sectors : null;
  if (!arr) { for (const v of Object.values(c)) { if (Array.isArray(v)) { arr = v; break; } } }
  arr = arr || [];
  const n = arr.length;
  const colClass = (n <= 1) ? "cols1" : ((n === 3 || n === 6 || n === 9) ? "cols3" : "");

  const cells = arr.map((s) => {
    if (!s || typeof s !== "object") return "";
    const name = s.name || s.sector || s.title || s.otsikko || "";
    const desc = s.desc || s.description || s.kuvaus || "";
    const score = (s.score !== undefined && s.score !== null && s.score !== "") ? s.score : "";
    const risk = s.risk || "";
    const tag = score !== "" ? `<div class="appx-sector-tag">${esc(score)}</div>` : "";
    const riskLine = risk ? `<div class="appx-sector-risk"><b>Riski</b> ${esc(risk)}</div>` : "";
    return `<div class="appx-sector">${tag}${name ? `<div class="appx-sector-name">${esc(name)}</div>` : ""}${desc ? `<div class="appx-sector-desc">${esc(desc)}</div>` : ""}${riskLine}</div>`;
  }).join("");

  const main = n ? `<div class="appx-sector-grid ${colClass}">${cells}</div>` : "";
  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}
