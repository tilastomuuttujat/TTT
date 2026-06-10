// renderers/list.js — luettelo (ordered/unordered), kohteet merkkijonoja tai {title,body}.
let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-list", `
    .appx .app-list { padding-left: 18px; margin: 10px 0; }
    .appx .app-list li { padding: 6px 0; line-height: 1.55; color: var(--fg-soft, #3a332a); }
    .appx .app-list li::marker { color: var(--muted, #6b6356); }
    .appx .app-list .app-list-head { font-weight: 500; color: var(--fg, #1f1b15); margin-bottom: 2px; }
    .appx .app-list .app-list-body { font-size: 14px; color: var(--muted, #6b6356); line-height: 1.55; }
  `);
}
export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const items = Array.isArray(c.items) ? c.items : [];
  const tag = c.ordered === true ? "ol" : "ul";
  const listHtml = items.length
    ? `<${tag} class="app-list">${items.map((it) => {
        if (typeof it === "string") return `<li>${esc(it)}</li>`;
        if (it && typeof it === "object") {
          const head = it.title || it.label || it.name;
          const body = it.body || it.text || it.description;
          return `<li>${head ? `<div class="app-list-head">${esc(head)}</div>` : ""}${body ? `<div class="app-list-body">${esc(body)}</div>` : ""}</li>`;
        }
        return "";
      }).join("")}</${tag}>`
    : "";
  el.innerHTML = util.lead(c) + util.note(c) + listHtml + util.extras(c) + util.source(c);
}
