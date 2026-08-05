import { fetchJson, resolveUrl, escapeHtml, commonStyles, renderState } from "./atlas-data.js";

class AtlasArticle extends HTMLElement {
  static observedAttributes = ["article", "data-base", "articles-url", "compact"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.load(); }
  attributeChangedCallback() { if (this.isConnected) this.load(); }

  async load() {
    const id = this.getAttribute("article");
    if (!id) return renderState(this.shadowRoot, "error", "Artikkelin tunnus puuttuu.");
    renderState(this.shadowRoot, "loading", "Ladataan artikkelia…");

    try {
      const url = resolveUrl(this, "articles-url", "artikkelit.json");
      const document = await fetchJson(url);
      const article = (document.articles ?? []).find(item => item.id === id);
      if (!article) throw new Error(`Artikkelia ${id} ei löydy.`);
      this.renderArticle(article);
    } catch (error) {
      console.error("atlas-article:", error);
      renderState(this.shadowRoot, "error", error.message || "Artikkelia ei voitu ladata.");
    }
  }

  renderArticle(article) {
    const compact = this.hasAttribute("compact");
    const body = compact ? (article.body ?? []).slice(0, 2) : (article.body ?? []);
    const tags = (article.tags ?? []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
    const images = compact ? [] : (article.images ?? []);

    this.shadowRoot.innerHTML = `
      <style>
        ${commonStyles()}
        article { padding:clamp(20px,4vw,34px); }
        .eyebrow { margin:0 0 8px; color:#b56a34; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
        h2 { margin:0; font-size:clamp(1.45rem,3vw,2.25rem); line-height:1.08; }
        .dek { margin:14px 0 0; color:#5f6b65; font-size:1.04rem; }
        .tags { display:flex; flex-wrap:wrap; gap:7px; margin-top:16px; }
        .tags span { padding:3px 9px; border-radius:999px; background:#f0ece2; color:#52605a; font-size:11px; }
        .body { margin-top:24px; max-width:76ch; }
        .body p { margin:0 0 1em; font-family:var(--atlas-serif,Georgia,serif); font-size:1.02rem; line-height:1.7; }
        figure { margin:24px 0 0; }
        img { width:100%; max-height:520px; object-fit:contain; border-radius:12px; background:#f4f1e8; }
        figcaption { margin-top:7px; color:#6d7772; font-size:12px; }
      </style>
      <article class="surface">
        <p class="eyebrow">Atlas-artikkeli</p>
        <h2>${escapeHtml(article.title)}</h2>
        ${article.dek ? `<p class="dek">${escapeHtml(article.dek)}</p>` : ""}
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div class="body">${body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
        ${images.map(image => `<figure><img src="${escapeHtml(image.url)}" alt=""><figcaption>${escapeHtml(image.caption || "")}</figcaption></figure>`).join("")}
      </article>`;
  }
}

if (!customElements.get("atlas-article")) customElements.define("atlas-article", AtlasArticle);
