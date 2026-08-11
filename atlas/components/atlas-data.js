const MODULE_URL = new URL(import.meta.url);
export const DEFAULT_BASE_URL = new URL("../", MODULE_URL);

const cache = new Map();

export async function fetchJson(urlLike) {
  const url = urlLike instanceof URL ? urlLike : new URL(urlLike, document.baseURI);
  const key = url.href;
  if (!cache.has(key)) {
    cache.set(key, fetch(url, { cache: "no-cache" }).then(async response => {
      if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
      return response.json();
    }));
  }
  return cache.get(key);
}

export function resolveBase(element) {
  return element.getAttribute("data-base")
    ? new URL(element.getAttribute("data-base"), document.baseURI)
    : DEFAULT_BASE_URL;
}

export function resolveUrl(element, attribute, filename) {
  return element.getAttribute(attribute)
    ? new URL(element.getAttribute(attribute), document.baseURI)
    : new URL(filename, resolveBase(element));
}

export function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

export function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function attrBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return !["false", "0", "no", "off"].includes(String(value).toLowerCase());
}

export function unique(values) {
  return [...new Set(values)];
}

export function commonStyles() {
  return `
    :host { display:block; color:var(--atlas-ink,#172421); font-family:var(--atlas-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); }
    * { box-sizing:border-box; }
    .surface { background:var(--atlas-paper,#fdfcf7); border:1px solid var(--atlas-line,#ded8ca); border-radius:var(--atlas-radius,16px); box-shadow:0 8px 30px rgba(18,51,47,.08); overflow:hidden; }
    :host([appearance="frameless"]) .surface { background:transparent; border-color:transparent; border-radius:0; box-shadow:none; overflow:visible; }
    :host([appearance="frameless"]) .loading,
    :host([appearance="frameless"]) .error { border-color:transparent; border-radius:0; background:transparent; box-shadow:none; }

    /* Frameless Atlas embeds: hierarchy comes from spacing and data, not nested cards. */
    :host([appearance="frameless"]) .decades {
      margin-top:20px;
      padding:12px 0 14px;
      border:0;
      border-radius:0;
      border-bottom:1px solid rgba(222,216,202,.72);
      background:transparent;
    }
    :host([appearance="frameless"]) .bars { height:58px; }
    :host([appearance="frameless"]) .periods { gap:5px 12px; }
    :host([appearance="frameless"]) .periods button {
      padding:4px 2px;
      border:0;
      border-radius:0;
      background:transparent;
    }
    :host([appearance="frameless"]) .periods button.active {
      color:#b56a34;
      background:transparent;
      box-shadow:inset 0 -1px 0 #b56a34;
    }
    :host([appearance="frameless"]) .tools {
      gap:18px;
      padding:2px 0 10px;
      border-bottom:1px solid rgba(222,216,202,.55);
    }
    :host([appearance="frameless"]) .group {
      gap:4px;
      padding:0;
      border:0;
      border-radius:0;
      background:transparent;
    }
    :host([appearance="frameless"]) .group > span { padding-left:0; margin-right:3px; }
    :host([appearance="frameless"]) .chip { padding:5px 8px; }
    :host([appearance="frameless"]) .chip.active { border-radius:999px; }
    :host([appearance="frameless"]) .reset {
      border:0;
      border-radius:0;
      padding:5px 0;
      border-bottom:1px solid rgba(101,113,107,.35);
    }
    :host([appearance="frameless"]) .scroller {
      border:0;
      border-radius:0;
      background:transparent;
    }
    :host([appearance="frameless"]) .corner,
    :host([appearance="frameless"]) .year,
    :host([appearance="frameless"]) .label { background:var(--atlas-paper,#fdfcf7); }
    :host([appearance="frameless"]) .legend { margin-top:9px; }

    .loading,.error { padding:24px; border:1px solid var(--atlas-line,#ded8ca); border-radius:var(--atlas-radius,16px); background:var(--atlas-paper,#fdfcf7); }
    .error { color:#9b392c; }
    h2,h3 { color:var(--atlas-title,#1f4642); font-family:var(--atlas-serif,Georgia,serif); }
    a { color:var(--atlas-link,#2f6f68); }
  `;
}

export function renderState(root, kind, message) {
  root.innerHTML = `<style>${commonStyles()}</style><div class="${kind}">${escapeHtml(message)}</div>`;
}
