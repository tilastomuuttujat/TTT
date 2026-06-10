// renderers/paperdoll.js — hahmot vierekkäin/ruudukossa (kuva, nimi, tunnusluvut).
let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-paperdoll", `
    .appx .paperdoll-backdrop { position: relative; overflow: hidden; min-height: 210px; align-items: stretch; text-align: left; }
    .appx .paperdoll-backdrop .paperdoll-bg { position: absolute; inset: 0; background-repeat: no-repeat; background-position: right center; background-size: contain; pointer-events: none; z-index: 0; }
    .appx .paperdoll-backdrop .paperdoll-fg { position: relative; z-index: 1; width: 100%; box-sizing: border-box; padding-right: 38%; }
    @media (max-width: 560px) { .appx .paperdoll-backdrop .paperdoll-fg { padding-right: 0; } .appx .paperdoll-backdrop .paperdoll-bg { background-position: right top; background-size: 46% auto; opacity: .16 !important; } }
    .appx .paperdoll-set { display: grid; gap: 20px; margin: 12px 0; }
    .appx .paperdoll-set.paperdoll-row { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .appx .paperdoll-set.paperdoll-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 520px) { .appx .paperdoll-set.paperdoll-grid { grid-template-columns: 1fr; } }
    .appx .paperdoll { margin: 0; padding: 14px; background: var(--card, #fff); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .appx .paperdoll-image { width: 100%; max-width: 220px; aspect-ratio: 2/3; display: flex; align-items: center; justify-content: center; background: var(--bg-soft, #f4efe5); border-radius: 8px; overflow: hidden; }
    .appx .paperdoll-image img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .appx .paperdoll-image-empty::before { content: "—"; color: var(--muted-2, #8a8276); font-size: 28px; }
    .appx .paperdoll-head { margin-top: 12px; }
    .appx .paperdoll-label { font-family: "Instrument Serif", Georgia, serif; font-size: 22px; line-height: 1.15; color: var(--fg, #1f1b15); }
    .appx .paperdoll-sublabel { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted, #6b6356); margin-top: 2px; }
    .appx .paperdoll-stats { margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .appx .paperdoll-stat { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 6px 8px; border-radius: 6px; background: var(--bg-soft, #f4efe5); }
    .appx .paperdoll-stat dt { font-size: 12px; color: var(--muted, #6b6356); text-align: left; flex: 1; }
    .appx .paperdoll-stat dd { margin: 0; font-weight: 500; font-size: 14px; color: var(--fg, #1f1b15); text-align: right; white-space: nowrap; }
    .appx .paperdoll-caption { margin-top: 10px; font-size: 13px; color: var(--muted, #6b6356); line-height: 1.5; }
    .appx .paperdoll-era-context { margin: 18px 0 0; line-height: 1.6; }
    .appx .paperdoll-block-intro { margin: 18px 0 8px; font-style: italic; color: var(--muted, #6b6356); line-height: 1.5; }
    .appx .paperdoll-table-wrap { overflow-x: auto; margin: 8px 0; }
    .appx .paperdoll-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .appx .paperdoll-table th, .appx .paperdoll-table td { padding: 6px 10px; border-bottom: 1px solid var(--line, #e6dfd0); }
    .appx .paperdoll-table thead th { color: var(--muted, #6b6356); font-size: 12px; font-weight: 600; text-align: left; }
    .appx .paperdoll-table tbody th { text-align: left; font-weight: 500; }
    .appx .paperdoll-table tbody td { text-align: right; white-space: nowrap; }
  `);
}

function block(b, esc) {
  if (!b || typeof b !== "object") return "";
  const intro = b.intro ? `<p class="paperdoll-block-intro">${esc(b.intro)}</p>` : "";
  const rows = Array.isArray(b.rows) ? b.rows : [];
  let table = "";
  if (rows.length) {
    const head = Array.isArray(b.headers) && b.headers.length ? `<thead><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : "";
    const body = `<tbody>${rows.map((r) => `<tr>${(Array.isArray(r) ? r : [r]).map((cell, i) => i === 0 ? `<th>${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    table = `<div class="paperdoll-table-wrap"><table class="paperdoll-table">${head}${body}</table></div>`;
  }
  const reading = b.reading ? `<div class="appx-note">${esc(b.reading)}</div>` : "";
  const sources = b.sources ? `<div class="appx-source">${esc(b.sources)}</div>` : "";
  return intro + table + reading + sources;
}

export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const subjects = Array.isArray(c.subjects) ? c.subjects : [];
  const layoutClass = c.layout === "grid" ? "paperdoll-grid" : "paperdoll-row";
  const backdrop = c.backdrop === true && subjects.length === 1;
  const bgOpacity = (typeof c.bg_opacity === "number") ? c.bg_opacity : 0.4;
  const figures = subjects.map((s) => {
    const head = (s.label || s.sublabel) ? `<div class="paperdoll-head">${s.label ? `<div class="paperdoll-label">${esc(s.label)}</div>` : ""}${s.sublabel ? `<div class="paperdoll-sublabel">${esc(s.sublabel)}</div>` : ""}</div>` : "";
    const stats = Array.isArray(s.stats) && s.stats.length
      ? `<dl class="paperdoll-stats">${s.stats.map((st) => `<div class="paperdoll-stat"><dt>${esc(st.label || "")}</dt><dd>${esc(st.value || "")}</dd></div>`).join("")}</dl>`
      : "";
    const caption = s.caption ? `<div class="paperdoll-caption">${esc(s.caption)}</div>` : "";
    if (backdrop && s.image) {
      return `<figure class="paperdoll paperdoll-backdrop"><div class="paperdoll-bg" style="background-image:url('${esc(s.image)}'); opacity:${bgOpacity};" role="img" aria-label="${esc(s.alt || s.label || "")}"></div><div class="paperdoll-fg">${head}${stats}${caption}</div></figure>`;
    }
    const img = s.image
      ? `<div class="paperdoll-image"><img src="${esc(s.image)}" alt="${esc(s.alt || s.label || "")}" loading="lazy"></div>`
      : `<div class="paperdoll-image paperdoll-image-empty" aria-hidden="true"></div>`;
    return `<figure class="paperdoll">${img}${head}${stats}${caption}</figure>`;
  }).join("");
  const wrap = subjects.length ? `<div class="paperdoll-set ${layoutClass}">${figures}</div>` : "";
  const eraContext = c.era_context ? `<p class="paperdoll-era-context">${esc(c.era_context)}</p>` : "";
  const eraStats = block(c.era_stats, esc);
  const cousins = block(c.cousins, esc);
  const cousinsNote = c.cousins_note ? `<div class="appx-note">${esc(c.cousins_note)}</div>` : "";
  el.innerHTML = util.lead(c) + util.note(c) + wrap + eraContext + eraStats + cousins + cousinsNote + util.source(c);
}
