// renderers/table.js — taulukko. Rivit objekteja (avaimet sarakkeiksi) tai taulukoita (headers-otsikot).
let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-table", `
    .appx .app-table-title { font-weight: 600; color: var(--accent, #1f1b15); font-size: .82rem; margin: 10px 0 4px; }
    .appx .app-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .appx .app-table th, .appx .app-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line, #e6dfd0); vertical-align: top; }
    .appx .app-table th { font-weight: 500; text-transform: uppercase; letter-spacing: .06em; font-size: 11px; color: var(--muted, #6b6356); background: var(--bg-soft, #f4efe5); }
    .appx .app-table td { line-height: 1.5; color: var(--fg-soft, #3a332a); }
    .appx .app-table tr:last-child td { border-bottom: none; }
  `);
}
export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const rows = Array.isArray(c.rows) ? c.rows : [];
  let keys = Array.isArray(c.headers) ? c.headers : null;
  let table = "";
  if (rows.length) {
    const isObjectRows = rows[0] && typeof rows[0] === "object" && !Array.isArray(rows[0]);
    if (!keys && rows.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
      const seen = new Set(); keys = [];
      for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
    }
    const head = keys ? `<thead><tr>${keys.map((k) => `<th>${esc(String(k).replace(/_/g, " "))}</th>`).join("")}</tr></thead>` : "";
    const body = `<tbody>${rows.map((r) => {
      if (Array.isArray(r)) return `<tr>${r.map((cell) => `<td>${esc(cell ?? "")}</td>`).join("")}</tr>`;
      if (isObjectRows && keys) return `<tr>${keys.map((k) => `<td>${esc(r[k] ?? "")}</td>`).join("")}</tr>`;
      return "";
    }).join("")}</tbody>`;
    const title = c.title ? `<div class="app-table-title">${esc(c.title)}</div>` : "";
    table = `${title}<div style="overflow-x:auto"><table class="app-table">${head}${body}</table></div>`;
  }
  el.innerHTML = util.lead(c) + util.note(c) + table + util.extras(c) + util.source(c);
}
