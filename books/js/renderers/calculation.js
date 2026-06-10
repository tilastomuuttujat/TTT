// renderers/calculation.js — laskuri.
// Skeemat: interaktiivinen {formula, variable{id,min,max,default,unit,label}, result_formula, result_template, human_unit}
//          staattinen   {formula, variables[]{name,meaning}, example{}, human_unit}

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-calc", `
    .appx-calc { border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); padding: 14px 16px; margin: 14px 0 0; }
    .appx-calc-formula { font-size: 14px; line-height: 1.55; color: var(--fg-soft, #3a332a); border-left: 3px solid var(--accent-soft, #4a4034); padding: 2px 0 2px 12px; margin-bottom: 12px; }
    .appx-calc-label { display: block; font-size: 12px; color: var(--muted, #6b6356); margin-bottom: 6px; }
    .appx-calc-row { display: flex; align-items: center; gap: 12px; }
    .appx-calc-row input[type=range] { flex: 1; accent-color: var(--accent, #1f1b15); }
    .appx-calc-val { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--fg, #1f1b15); min-width: 80px; text-align: right; font-size: 14px; }
    .appx-calc-result { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line, #e6dfd0); font-size: 15px; line-height: 1.55; color: var(--fg, #1f1b15); }
    .appx-calc-result b { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 20px; }
    .appx-calc-human { font-size: 13px; line-height: 1.5; color: var(--muted, #6b6356); margin-top: 10px; }
    .appx-calc-defs { margin: 0 0 4px; font-size: 13px; }
    .appx-calc-defs dt { font-weight: 600; color: var(--fg-soft, #3a332a); margin-top: 8px; }
    .appx-calc-defs dd { margin: 1px 0 0; color: var(--muted, #6b6356); line-height: 1.5; }
    .appx-calc-example { margin-top: 10px; font-size: 13px; line-height: 1.5; color: var(--muted, #6b6356); border-top: 1px dashed var(--line, #e6dfd0); padding-top: 8px; }
    .appx-calc-example span { color: var(--muted-2, #8a8276); text-transform: uppercase; letter-spacing: .04em; font-size: 11px; font-weight: 600; }
  `);
}

function evalFormula(safe, varName, value) {
  try { return (new Function(varName, "return (" + safe + ");"))(value); }
  catch (e) { return null; }
}

export function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const v = (c.variable && typeof c.variable === "object") ? c.variable : null;
  const rf = typeof c.result_formula === "string" ? c.result_formula : "";
  const tmpl = c.result_template || "";
  const computable = v && v.id && rf && /^[\sa-zA-Z0-9_.,+\-*/()]+$/.test(rf);

  if (computable) {
    const vid = String(v.id);
    const min = Number(v.min), max = Number(v.max);
    const def = (v.default !== undefined && v.default !== null) ? Number(v.default) : min;
    const unit = v.unit || "", label = v.label || "";
    const main = `<div class="appx-calc">
      ${c.formula ? `<div class="appx-calc-formula">${esc(c.formula)}</div>` : ""}
      ${label ? `<label class="appx-calc-label">${esc(label)}</label>` : ""}
      <div class="appx-calc-row"><input type="range" min="${min}" max="${max}" value="${def}" step="1"><span class="appx-calc-val"></span></div>
      ${tmpl ? `<div class="appx-calc-result"></div>` : ""}
      ${c.human_unit ? `<div class="appx-calc-human">${esc(c.human_unit)}</div>` : ""}
    </div>`;
    el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);

    const inp = el.querySelector(".appx-calc input[type=range]");
    const valEl = el.querySelector(".appx-calc-val");
    const resEl = el.querySelector(".appx-calc-result");
    const safe = rf.replace(/\bround\s*\(/g, "Math.round(");
    const tok = new RegExp("\\{" + vid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\}", "g");
    const upd = () => {
      const val = Number(inp.value);
      if (valEl) valEl.textContent = val + " " + unit;
      if (resEl) {
        const r = evalFormula(safe, vid, val);
        const rTxt = (r === null || r === undefined || (typeof r === "number" && !isFinite(r))) ? "?" : String(r);
        resEl.innerHTML = esc(tmpl).replace(tok, String(val)).replace(/\{result\}/g, "<b>" + esc(rTxt) + "</b>");
      }
    };
    if (inp) { inp.addEventListener("input", upd); upd(); }
    return;
  }

  // staattinen kaavakortti
  const defs = Array.isArray(c.variables) && c.variables.length
    ? `<dl class="appx-calc-defs">${c.variables.map((x) => `<dt>${esc((x && (x.name || x.id)) || "")}</dt><dd>${esc((x && (x.meaning || x.label)) || "")}</dd>`).join("")}</dl>`
    : "";
  const example = (c.example && typeof c.example === "object")
    ? `<div class="appx-calc-example">${Object.entries(c.example).filter(([k, vv]) => typeof vv === "string" && vv.trim()).map(([k, vv]) => `<div><span>${esc(k.replace(/_/g, " "))}</span> ${esc(vv)}</div>`).join("")}</div>`
    : "";
  const main = (c.formula || c.human_unit || defs || example) ? `<div class="appx-calc">
      ${c.formula ? `<div class="appx-calc-formula">${esc(c.formula)}</div>` : ""}
      ${defs}${example}
      ${c.human_unit ? `<div class="appx-calc-human">${esc(c.human_unit)}</div>` : ""}
    </div>` : "";

  el.innerHTML = util.lead(c) + util.note(c) + main + util.extras(c) + util.source(c);
}
