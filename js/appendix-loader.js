// appendix-loader.js — ainoa jaettu osa. Puhdas esityskerros: ei Supabasea, ei authia.
// Vastuu: valitse oikea renderöijä (content.view || type), lataa se dynaamisesti,
// tarjoa idempotentti kirjasto- ja CSS-lataus sekä jaetut esitysapurit.

const LIBS = {
  chartjs: "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  d3: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",
};

const _libs = {};
const _mods = {};
let _baseDone = false;

export function esc(v) {
  return String(v ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));
}

export function injectStyle(id, css) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

export function loadLib(name) {
  if (_libs[name]) return _libs[name];
  const url = LIBS[name];
  if (!url) return Promise.reject(new Error("Tuntematon kirjasto: " + name));
  _libs[name] = new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = url;
    sc.onload = () => res();
    sc.onerror = () => rej(new Error("Kirjaston lataus epäonnistui: " + url));
    document.head.appendChild(sc);
  });
  return _libs[name];
}

// ── jaetut esitysapurit, välitetään moduuleille opts.util kautta ──
function lead(c) { return c && c.body ? `<p class="appx-lead">${esc(c.body)}</p>` : ""; }
function note(c) { return c && c.note ? `<div class="appx-note">${esc(c.note)}</div>` : ""; }
function source(c) { return c && c.source ? `<div class="appx-source">${esc(c.source)}</div>` : ""; }

function extras(c) {
  if (!c) return "";
  const out = [];
  const txt = ["reader_shift", "key_insight", "open_question", "breakeven", "reflection", "lesson", "paradox", "current_relevance", "implication"];
  for (const k of txt) {
    if (typeof c[k] === "string" && c[k].trim()) {
      out.push(`<div class="appx-extra"><span class="appx-extra-label">${esc(k.replace(/_/g, " "))}</span>${esc(c[k])}</div>`);
    }
  }
  if (Array.isArray(c.findings) && c.findings.length) {
    out.push(`<ul class="appx-findings">${c.findings.map((f) => {
      if (typeof f === "string") return `<li>${esc(f)}</li>`;
      if (!f || typeof f !== "object") return "";
      const head = f.aihe || f.title || f.otsikko || f.teema || "";
      const body = f.havainto || f.kuvaus || f.body || f.finding || "";
      return `<li>${head ? `<b>${esc(head)}</b> ` : ""}${esc(body)}</li>`;
    }).join("")}</ul>`);
  }
  return out.join("");
}

function kvFallback(c, skip) {
  if (!c || typeof c !== "object") return "";
  const rows = Object.entries(c).filter(([k, v]) => !skip.includes(k) && typeof v === "string" && v.trim());
  if (!rows.length) return "";
  return `<dl class="appx-kv">${rows.map(([k, v]) => `<dt>${esc(k.replace(/_/g, " "))}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
}

const util = { esc, injectStyle, loadLib, lead, note, source, extras, kvFallback };

function injectBase() {
  if (_baseDone) return;
  _baseDone = true;
  injectStyle("appx-base", `
    .appx { color: var(--fg, #1f1b15); }
    .appx-lead { font-size: 15px; line-height: 1.6; color: var(--fg-soft, #3a332a); margin: 0 0 12px; }
    .appx-note { font-size: 13px; line-height: 1.55; color: var(--muted, #6b6356); background: var(--bg-soft, #f4efe5); border-radius: 8px; padding: 8px 11px; margin: 10px 0 0; }
    .appx-source { font-size: 12px; color: var(--muted-2, #8a8276); margin-top: 12px; }
    .appx-extra { font-size: 13.5px; line-height: 1.55; color: var(--fg-soft, #3a332a); border-left: 2px solid var(--line-strong, #c9bfa9); padding-left: 12px; margin: 12px 0 0; }
    .appx-extra-label { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--muted-2, #8a8276); margin-bottom: 3px; }
    .appx-findings { margin: 10px 0 0; padding-left: 18px; font-size: 13.5px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx-kv { margin: 10px 0 0; font-size: 13.5px; }
    .appx-kv dt { font-weight: 600; color: var(--fg-soft, #3a332a); text-transform: uppercase; letter-spacing: .04em; font-size: 11px; margin-top: 8px; }
    .appx-kv dd { margin: 2px 0 0; color: var(--muted, #6b6356); line-height: 1.55; }
    .appx-chip { display: inline-block; font-size: 12px; line-height: 1.4; padding: 3px 9px; border-radius: 6px; border: 1px solid var(--line, #e6dfd0); background: var(--bg-soft, #f4efe5); color: var(--fg-soft, #3a332a); }
    .appx-loading { color: var(--muted-2, #8a8276); font-size: 13px; padding: 8px 0; }
  `);
}

// Tyyppi → oletusrenderöijä (tiedostonimi js/renderers/<key>.js)
const DEFAULT = {
  timeline: "timeline",
  chain: "chain",
  path: "path",
  sector: "sector",
  calculation: "calculation",
  correlation: "correlation",
  regression: "regression",
  lag: "lag",
  distribution: "distribution",
  heatmap: "heatmap",
  funnel: "funnel",
  zones: "zones",
  quiz: "quiz",
};

async function loadModule(key) {
  if (_mods[key]) return _mods[key];
  _mods[key] = import(`./renderers/${key}.js`).catch((e) => { _mods[key] = null; throw e; });
  return _mods[key];
}

export async function renderAppendix(el, app, opts = {}) {
  injectBase();
  el.classList.add("appx");
  const c = (app && app.content) || {};
  const type = (app && app.type) || "";
  const key = c.view || (app && app.view) || DEFAULT[type] || type;
  el.innerHTML = `<div class="appx-loading">…</div>`;

  let mod = null;
  try {
    mod = await loadModule(key);
  } catch (e) {
    if (key !== type && type) {
      try { mod = await loadModule(type); } catch (e2) { mod = null; }
    }
  }

  if (mod && typeof mod.render === "function") {
    try {
      await mod.render(el, c, { ...opts, util });
      return;
    } catch (e) {
      el.innerHTML = `<div class="appx-note">Renderöinti epäonnistui (${esc(key)}): ${esc(e && e.message)}</div>`;
      return;
    }
  }

  // Viimeinen fallback: geneerinen sisältö, ettei mikään jää tyhjäksi
  el.innerHTML = util.lead(c) + util.note(c) +
    util.kvFallback(c, ["body", "note", "source", "view", "_origId"]) +
    util.extras(c) + util.source(c);
}

export { util };
