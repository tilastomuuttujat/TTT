// renderers/chain.js — kytketty virtaus.
// Skeemat: steps[] {event|label, consequence|desc, concrete}  ·  nodes[] {label, desc, mechanism} (+ links[])

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-chain", `
    .appx-chain { list-style: none; margin: 14px 0 0; padding: 0; }
    .appx-chain-step { border: 1px solid var(--line, #e6dfd0); border-radius: 10px; background: var(--card, #fff); padding: 12px 14px; }
    .appx-chain-tag { float: right; margin-left: 8px; }
    .appx-chain-num { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--muted-2, #8a8276); margin-bottom: 4px; }
    .appx-chain-event { font-family: "Instrument Serif", Georgia, serif; font-size: 18px; line-height: 1.25; color: var(--fg, #1f1b15); }
    .appx-chain-conseq { font-size: 14px; line-height: 1.55; color: var(--muted, #6b6356); margin-top: 6px; padding-left: 16px; position: relative; }
    .appx-chain-conseq::before { content: "→"; position: absolute; left: 0; top: 0; color: var(--line-strong, #c9bfa9); }
    .appx-chain-concrete { font-size: 12.5px; line-height: 1.5; color: var(--fg-soft, #3a332a); background: var(--bg-soft, #f4efe5); border-radius: 6px; padding: 6px 9px; margin-top: 8px; }
    .appx-chain-link { display: flex; justify-content: center; padding: 2px 0; color: var(--line-strong, #c9bfa9); }
  `);
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  let steps = [];
  if (Array.isArray(c.steps) && c.steps.length) {
    steps = c.steps.map((s) => ({
      ev: (s && (s.event || s.label)) || "",
      conseq: (s && (s.consequence || s.desc)) || "",
      concrete: (s && s.concrete) || "",
      tag: "",
    }));
  } else if (Array.isArray(c.nodes) && c.nodes.length) {
    steps = c.nodes.map((n) => ({
      ev: (n && n.label) || "",
      conseq: (n && n.desc) || "",
      concrete: "",
      tag: (n && n.mechanism) || "",
    }));
  }

  const link = `<div class="appx-chain-link"><svg width="14" height="20" viewBox="0 0 14 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="0" x2="7" y2="14"/><path d="M3 10l4 4 4-4"/></svg></div>`;

  const flow = steps.length ? `<ol class="appx-chain">${steps.map((s, i) =>
    `<li><div class="appx-chain-step">${s.tag ? `<span class="appx-chip appx-chain-tag">${esc(s.tag)}</span>` : ""}<div class="appx-chain-num">Vaihe ${i + 1}</div>${s.ev ? `<div class="appx-chain-event">${esc(s.ev)}</div>` : ""}${s.conseq ? `<div class="appx-chain-conseq">${esc(s.conseq)}</div>` : ""}${s.concrete ? `<div class="appx-chain-concrete">${esc(s.concrete)}</div>` : ""}</div>${i < steps.length - 1 ? link : ""}</li>`
  ).join("")}</ol>` : "";

  el.innerHTML = util.lead(c) + util.note(c) + flow + util.extras(c) + util.source(c);
}
