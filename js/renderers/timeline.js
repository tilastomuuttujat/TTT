// renderers/timeline.js — pystysuora selkäranka-aikajana.
// Skeemat: events[] {aika|year|vuosi, tapahtuma|title|event, merkitys|description|desc,
//          vaikutus_positiivinen, vaikutus_kielteinen}  ·  varafallback: scenarios[]

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-timeline", `
    .appx-tl { position: relative; list-style: none; margin: 14px 0 0; padding: 0 0 0 30px; }
    .appx-tl::before { content: ""; position: absolute; left: 7px; top: 6px; bottom: 6px; width: 2px; background: var(--line-strong, #c9bfa9); }
    .appx-tl > li { position: relative; padding: 0 0 22px; }
    .appx-tl > li:last-child { padding-bottom: 0; }
    .appx-tl > li::before { content: ""; position: absolute; left: -30px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg, #fdfbf7); border: 2px solid var(--accent, #1f1b15); box-sizing: border-box; }
    .appx-tl > li:last-child::before { background: var(--accent, #1f1b15); }
    .appx-tl-period { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--muted-2, #8a8276); margin-bottom: 3px; }
    .appx-tl-event { font-family: "Instrument Serif", Georgia, serif; font-size: 20px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 4px; }
    .appx-tl-desc { font-size: 14px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx-tl-impacts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
    .appx-tl .pos { border-color: color-mix(in srgb, var(--accent, #1f1b15) 28%, var(--line, #e6dfd0)); }
    .appx-tl .neg { border-color: color-mix(in srgb, var(--danger, #a3271a) 45%, var(--line, #e6dfd0)); color: var(--danger, #a3271a); }
    .appx-tl-scen { display: grid; gap: 10px; margin: 14px 0 0; }
    .appx-tl-scen-card { border: 1px solid var(--line, #e6dfd0); border-left: 3px solid var(--accent-soft, #4a4034); border-radius: 8px; background: var(--bg-soft, #f4efe5); padding: 10px 12px; }
    .appx-tl-scen-card b { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 17px; }
    .appx-tl-scen-card div { font-size: 13.5px; line-height: 1.5; color: var(--muted, #6b6356); margin-top: 4px; }
  `);
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const raw = Array.isArray(c.entries) ? c.entries : (Array.isArray(c.events) ? c.events : []);
  const items = raw.map((e) => ({
    period: e.period || e.year || e.aika || e.vuosi || "",
    event: e.event || e.title || e.tapahtuma || "",
    desc: e.description || e.desc || e.merkitys || "",
    pos: e.vaikutus_positiivinen || "",
    neg: e.vaikutus_kielteinen || e.vaikutus_negatiivinen || "",
  }));

  let main = "";
  if (items.length) {
    main = `<ol class="appx-tl">${items.map((e) => {
      const imp = (e.pos || e.neg)
        ? `<div class="appx-tl-impacts">${e.pos ? `<span class="appx-chip pos">+ ${esc(e.pos)}</span>` : ""}${e.neg ? `<span class="appx-chip neg">− ${esc(e.neg)}</span>` : ""}</div>`
        : "";
      return `<li>${e.period ? `<div class="appx-tl-period">${esc(e.period)}</div>` : ""}${e.event ? `<div class="appx-tl-event">${esc(e.event)}</div>` : ""}${e.desc ? `<div class="appx-tl-desc">${esc(e.desc)}</div>` : ""}${imp}</li>`;
    }).join("")}</ol>`;
  } else if (Array.isArray(c.scenarios) && c.scenarios.length) {
    main = `<div class="appx-tl-scen">${c.scenarios.map((s) =>
      `<div class="appx-tl-scen-card"><b>${esc(s.label || s.id || "")}</b><div>${esc(s.desc || "")}</div></div>`
    ).join("")}</div>`;
  }

  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}
