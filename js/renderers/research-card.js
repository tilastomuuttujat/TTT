// renderers/research-card.js — luvun loppuun sijoittuva tutkimuskortti.
// Puhdas esitys: evidence-rivit ovat staattisia (data-evidence-key talletettu,
// jotta host voi halutessaan kytkeä klikkauksen; renderöijä ei tee sitä).

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-pcard", `
    .appx .pcard { border: 1px solid var(--line, #e6dfd0); border-radius: 14px; padding: 22px 22px 18px; background: var(--card, #fff); position: relative; }
    .appx .pcard-toplabel { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted-2, #8a8276); display: flex; align-items: center; gap: 8px; }
    .appx .pcard-status-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .appx .pcard-status-dot.ready { background: #1d9e75; }
    .appx .pcard-status-dot.partial { background: #d99a1d; }
    .appx .pcard-status-dot.requires_collection { background: var(--muted-2, #8a8276); }
    .appx .pcard-lens { font-family: "Instrument Serif", Georgia, serif; font-size: 26px; line-height: 1.15; margin: 4px 0 2px; color: var(--fg, #1f1b15); }
    .appx .pcard-claim { font-size: 17px; line-height: 1.5; color: var(--fg-soft, #3a332a); margin: 8px 0 16px; }
    .appx .pcard-falsification { border-left: 3px solid var(--accent, #1f1b15); background: var(--bg-soft, #f4efe5); border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 0 0 16px; }
    .appx .pcard-falsification .label { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--accent, #1f1b15); margin-bottom: 6px; }
    .appx .pcard-falsification .text { font-size: 15px; line-height: 1.55; color: var(--fg, #1f1b15); }
    .appx .pcard-falsification .op { font-size: 13.5px; line-height: 1.5; color: var(--muted, #6b6356); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line, #e6dfd0); }
    .appx .pcard-falsification .status-line { font-size: 12px; color: var(--muted-2, #8a8276); margin-top: 8px; display: flex; align-items: center; gap: 6px; }
    .appx .pcard-falsification-missing { border-left-color: #d99a1d; }
    .appx .pcard-falsification-missing .label { color: #d99a1d; }
    .appx .pcard-evidence-label { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--muted, #6b6356); margin-bottom: 8px; }
    .appx .pcard-evidence-list { display: flex; flex-direction: column; gap: 6px; }
    .appx .pcard-evidence-row { text-align: left; width: 100%; border: 1px solid var(--line, #e6dfd0); border-radius: 8px; padding: 10px 12px; background: transparent; }
    .appx .pcard-evidence-row .ev-title { font-size: 14.5px; color: var(--fg, #1f1b15); line-height: 1.4; }
    .appx .pcard-evidence-row .ev-meta { font-size: 12px; color: var(--muted-2, #8a8276); margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap; }
    .appx .pcard-evidence-row .ev-key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted-2, #8a8276); opacity: .7; }
    .appx .pcard-evidence-empty { font-size: 13px; color: var(--muted, #6b6356); font-style: italic; padding: 8px 0; }
  `);
}

export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;

  const status = c.falsification_data_available || c.data_status || "requires_collection";
  const statusLabel = c.data_status_fi || (status === "ready" ? "Testattavissa nyt" : status === "partial" ? "Osittain testattavissa" : "Vaatii aineiston keruun");

  const evidence = Array.isArray(c.evidence) && c.evidence.length
    ? c.evidence.filter((e) => e && e.evidence_key).map((e) => ({ evidence_key: e.evidence_key, title: e.title || e.evidence_key, type: e.type || "", source: e.source || "" }))
    : Array.isArray(c.evidence_keys)
      ? c.evidence_keys.map((key, i) => ({ evidence_key: key, title: Array.isArray(c.evidence_titles) ? (c.evidence_titles[i] || key) : key, type: "", source: "" }))
      : [];

  const evidenceHtml = evidence.length
    ? evidence.map((e) => {
        const key = e.evidence_key || "";
        const title = e.title || key;
        return `<div class="pcard-evidence-row" data-evidence-key="${esc(key)}">
            <div class="ev-title">${esc(title)}</div>
            <div class="ev-meta">${e.type ? `<span>${esc(e.type)}</span>` : ""}${e.source ? `<span>${esc(e.source)}</span>` : ""}${key ? `<span class="ev-key">${esc(key)}</span>` : ""}</div>
          </div>`;
      }).join("")
    : `<div class="pcard-evidence-empty">Ei evidence-linkkejä.</div>`;

  el.innerHTML = `<article class="pcard">
      <div class="pcard-toplabel"><span class="pcard-status-dot ${esc(status)}"></span><span>Ennuste ${esc(c.prediction_number || "")}</span></div>
      <div class="pcard-lens">${esc(c.lens || "Tutkimuskortti")}</div>
      ${c.prediction ? `<div class="pcard-claim">${esc(c.prediction)}</div>` : ""}
      <div class="pcard-falsification ${c.falsification ? "" : "pcard-falsification-missing"}">
        <div class="label">Mikä heikentäisi tätä ennustetta?</div>
        <div class="text">${esc(c.falsification || "Falsifiointiehto puuttuu.")}</div>
        ${c.falsification_operationalized ? `<div class="op">${esc(c.falsification_operationalized)}</div>` : ""}
        <div class="status-line"><span class="pcard-status-dot ${esc(status)}"></span><span>${esc(statusLabel)}</span></div>
      </div>
      <div class="pcard-evidence-label">Evidence${typeof c.evidence_count === "number" ? ` · ${esc(c.evidence_count)} kpl` : ""}</div>
      <div class="pcard-evidence-list">${evidenceHtml}</div>
    </article>`;
}
