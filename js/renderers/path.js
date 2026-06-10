// renderers/path.js — valinnat ja reitit.
// Skeemat: paths[] {condition|title|label, claim|body|desc, promise, price}  (rinnakkaiset reitit)
//          steps[] {label, desc, actors[], timeframe, difficulty, prerequisite}  (roadmap)

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-path", `
    .appx-path-fork { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--muted-2, #8a8276); margin: 14px 0 8px; display: flex; align-items: center; gap: 8px; }
    .appx-path-fork::after { content: ""; flex: 1; height: 1px; background: var(--line, #e6dfd0); }
    .appx-path-set { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .appx-path { border: 1px solid var(--line, #e6dfd0); border-top: 3px solid var(--accent-soft, #4a4034); border-radius: 10px; background: var(--card, #fff); padding: 12px 14px; display: flex; flex-direction: column; }
    .appx-path-cond { font-family: "Instrument Serif", Georgia, serif; font-size: 18px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 6px; }
    .appx-path-claim { font-size: 14px; line-height: 1.55; color: var(--fg-soft, #3a332a); margin-bottom: 10px; }
    .appx-path-facet { border-top: 1px solid var(--line, #e6dfd0); padding-top: 8px; margin-top: auto; }
    .appx-path-facet + .appx-path-facet { margin-top: 8px; }
    .appx-path-facet dt { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted-2, #8a8276); margin: 0 0 2px; }
    .appx-path-facet dd { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--fg-soft, #3a332a); }
    .appx-path-facet.promise dt { color: var(--accent, #1f1b15); }
    .appx-road { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 10px; }
    .appx-road-step { display: grid; grid-template-columns: 28px 1fr; gap: 12px; align-items: start; border: 1px solid var(--line, #e6dfd0); border-radius: 10px; background: var(--card, #fff); padding: 12px 14px; }
    .appx-road-num { width: 26px; height: 26px; border-radius: 50%; background: var(--accent, #1f1b15); color: var(--bg, #fff); font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
    .appx-road-label { font-family: "Instrument Serif", Georgia, serif; font-size: 17px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 4px; }
    .appx-road-desc { font-size: 13.5px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx-road-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .appx-road-actors { font-size: 12px; color: var(--muted-2, #8a8276); margin-top: 6px; }
  `);
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  let main = "";
  if (Array.isArray(c.paths) && c.paths.length) {
    const cards = c.paths.map((p) => {
      if (!p || typeof p !== "object") return "";
      const cond = p.condition || p.title || p.label || "";
      const claim = p.claim || p.body || p.desc || "";
      const promise = p.promise || "";
      const price = p.price || "";
      const facets = (promise ? `<div class="appx-path-facet promise"><dt>Lupaus</dt><dd>${esc(promise)}</dd></div>` : "") +
                     (price ? `<div class="appx-path-facet"><dt>Hinta</dt><dd>${esc(price)}</dd></div>` : "");
      return `<li class="appx-path">${cond ? `<div class="appx-path-cond">${esc(cond)}</div>` : ""}${claim ? `<div class="appx-path-claim">${esc(claim)}</div>` : ""}${facets}</li>`;
    }).join("");
    const label = c.paths.length === 1 ? "Reitti" : `${c.paths.length} reittiä`;
    main = `<div class="appx-path-fork">${label}</div><ul class="appx-path-set">${cards}</ul>`;
  } else if (Array.isArray(c.steps) && c.steps.length) {
    main = `<ol class="appx-road">${c.steps.map((s, i) => {
      if (!s || typeof s !== "object") return "";
      const meta = [s.timeframe, s.difficulty].filter(Boolean).map((m) => `<span class="appx-chip">${esc(m)}</span>`).join("");
      const actors = Array.isArray(s.actors) && s.actors.length ? `<div class="appx-road-actors">${s.actors.map((a) => esc(a)).join(" · ")}</div>` : "";
      return `<li class="appx-road-step"><div class="appx-road-num">${i + 1}</div><div>${s.label ? `<div class="appx-road-label">${esc(s.label)}</div>` : ""}${s.desc ? `<div class="appx-road-desc">${esc(s.desc)}</div>` : ""}${meta ? `<div class="appx-road-meta">${meta}</div>` : ""}${actors}</div></li>`;
    }).join("")}</ol>`;
  }

  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}
