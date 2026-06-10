// renderers/evidence.js — todistepohjaiset liitteet (myös oletus monille).
// Poimii ensimmäisen taulukkokentän (≠ tables) listaksi; tables[] taulukoiksi;
// commentary-kentät tekstilaatikoiksi; distinction-olio avain–arvo-listaksi.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-evidence", `
    .appx .app-items { list-style: none; padding: 0; margin: 10px 0 0; }
    .appx .app-items > li { padding: 14px 0; border-bottom: 1px solid var(--line, #e6dfd0); }
    .appx .app-items > li:last-child { border-bottom: none; }
    .appx .app-item-head { font-family: "Instrument Serif", Georgia, serif; font-size: 17px; line-height: 1.3; margin-bottom: 6px; color: var(--fg, #1f1b15); }
    .appx .app-item-body { font-size: 14px; line-height: 1.6; color: var(--muted, #6b6356); }
    .appx .app-item-body p { margin: 0 0 .6em; }
    .appx .app-item-body p:last-child { margin-bottom: 0; }
    .appx .app-evi-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
    .appx .app-evi-table th, .appx .app-evi-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line, #e6dfd0); vertical-align: top; }
    .appx .app-evi-table th { font-weight: 500; text-transform: uppercase; letter-spacing: .06em; font-size: 11px; color: var(--muted, #6b6356); background: var(--bg-soft, #f4efe5); }
    .appx .app-evi-table td { line-height: 1.5; color: var(--fg-soft, #3a332a); }
  `);
}

function tableBlock(t, esc) {
  if (!t || typeof t !== "object") return "";
  const headers = Array.isArray(t.headers) ? t.headers : null;
  const rows = Array.isArray(t.rows) ? t.rows : [];
  if (!rows.length) return "";
  const title = t.title ? `<div class="appx-extra-label">${esc(t.title)}</div>` : "";
  const head = headers ? `<thead><tr>${headers.map((h) => `<th>${esc(String(h))}</th>`).join("")}</tr></thead>` : "";
  const body = `<tbody>${rows.map((r) => Array.isArray(r) ? `<tr>${r.map((cell) => `<td>${esc(cell ?? "")}</td>`).join("")}</tr>` : "").join("")}</tbody>`;
  return `${title}<div style="overflow-x:auto"><table class="app-evi-table">${head}${body}</table></div>`;
}

function evidenceItem(item, esc) {
  if (typeof item === "string") return `<li><div class="app-item-body">${esc(item)}</div></li>`;
  if (!item || typeof item !== "object") return "";
  const titleKeys = ["domain", "aihe", "tapaus", "murros", "mittari", "kanta", "kyky", "lähestymistapa", "kuvaus", "taso", "aalto", "löytö"];
  const bodyKeys = ["example", "havainto", "kuvaus", "vääristymä", "tila", "consequence", "tulos", "huoli", "rajoitus", "idea"];
  let titleKey = titleKeys.find((k) => typeof item[k] === "string" && item[k].trim());
  let bodyKey = bodyKeys.find((k) => k !== titleKey && typeof item[k] === "string" && item[k].trim());
  const stringKeys = Object.keys(item).filter((k) => typeof item[k] === "string" && item[k].trim());
  if (!titleKey && stringKeys.length) titleKey = stringKeys[0];
  if (!bodyKey && stringKeys.length > 1) bodyKey = stringKeys.find((k) => k !== titleKey);
  const titleHtml = titleKey ? `<div class="app-item-head">${esc(item[titleKey])}</div>` : "";
  const bodyHtml = bodyKey ? `<div class="app-item-body"><p>${esc(item[bodyKey])}</p></div>` : "";
  const restKeys = stringKeys.filter((k) => k !== titleKey && k !== bodyKey);
  const rest = restKeys.length
    ? `<dl class="appx-kv">${restKeys.map((k) => `<dt>${esc(k.replace(/_/g, " "))}</dt><dd>${esc(item[k])}</dd>`).join("")}</dl>`
    : "";
  return `<li>${titleHtml}${bodyHtml}${rest}</li>`;
}

export function render(el, c, opts) {
  const { util } = opts; injectCss(util); const esc = util.esc;
  const commentaryFields = ["consensus", "honest_assessment", "pattern", "deeper_pattern", "current_relevance", "controversy", "relevance", "implication", "ai_question", "neuroscience_link", "open_question"];

  let listVal = null;
  for (const [k, v] of Object.entries(c)) if (Array.isArray(v) && k !== "tables") { listVal = v; break; }
  const tablesHtml = Array.isArray(c.tables) ? c.tables.map((t) => tableBlock(t, esc)).join("") : "";

  const commentary = commentaryFields
    .filter((k) => typeof c[k] === "string" && c[k].trim())
    .map((k) => `<div class="appx-extra"><span class="appx-extra-label">${esc(k.replace(/_/g, " "))}</span>${esc(c[k])}</div>`).join("");

  let objects = "";
  if (c.distinction && typeof c.distinction === "object" && !Array.isArray(c.distinction)) {
    const rows = Object.entries(c.distinction).map(([key, val]) => `<dt>${esc(key.replace(/_/g, " "))}</dt><dd>${esc(val)}</dd>`).join("");
    objects = `<dl class="appx-kv">${rows}</dl>`;
  }

  const list = (listVal && listVal.length) ? `<ul class="app-items">${listVal.map((item) => evidenceItem(item, esc)).join("")}</ul>` : "";

  el.innerHTML = util.lead(c) + util.note(c) + objects + list + tablesHtml + commentary + util.extras(c) + util.source(c);
}
