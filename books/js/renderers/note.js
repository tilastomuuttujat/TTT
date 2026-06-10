// renderers/note.js — lyhyt reflektio / muistiinpano.
let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-note", `
    .appx .app-note-text { font-size: 15px; line-height: 1.7; color: var(--fg-soft, #3a332a); margin-top: 4px; white-space: pre-wrap; }
  `);
}
export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const text = c.text ? `<div class="app-note-text">${esc(c.text)}</div>` : "";
  el.innerHTML = util.lead(c) + util.note(c) + text + util.extras(c) + util.source(c);
}
