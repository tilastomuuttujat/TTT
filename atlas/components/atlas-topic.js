import "./atlas-stat-card.js";
import "./atlas-article.js";
import { fetchJson, resolveUrl, escapeHtml, commonStyles, renderState } from "./atlas-data.js";

class AtlasTopic extends HTMLElement {
  static observedAttributes = ["item", "cards", "data-base", "atlas-url", "articles-url"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.load(); }
  attributeChangedCallback() { if (this.isConnected) this.load(); }

  async load() {
    const id = this.getAttribute("item");
    if (!id) return renderState(this.shadowRoot, "error", "Aiheen item-tunnus puuttuu.");
    renderState(this.shadowRoot, "loading", "Ladataan Atlas-aihetta…");

    try {
      const atlasUrl = resolveUrl(this, "atlas-url", "murrosatlas.json");
      const articlesUrl = resolveUrl(this, "articles-url", "artikkelit.json");
      const [atlas, articleDoc] = await Promise.all([fetchJson(atlasUrl), fetchJson(articlesUrl)]);
      const item = (atlas.items ?? []).find(entry => entry.id === id);
      if (!item) throw new Error(`Murroskohdetta ${id} ei löydy.`);

      const linkedArticleIds = (articleDoc.links ?? [])
        .filter(link => link.item_id === id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(link => link.article_id);
      const article = (articleDoc.articles ?? []).find(entry => linkedArticleIds.includes(entry.id));
      this.renderTopic(item, article);
    } catch (error) {
      console.error("atlas-topic:", error);
      renderState(this.shadowRoot, "error", error.message || "Aihetta ei voitu ladata.");
    }
  }

  renderTopic(item, article) {
    const cards = (this.getAttribute("cards") || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
    const period = item.year_end && item.year_end !== item.year_start
      ? `${item.year_start}–${item.year_end}`
      : `${item.year_start ?? ""}`;

    this.shadowRoot.innerHTML = `
      <style>
        ${commonStyles()}
        .topic { padding:clamp(20px,4vw,34px); }
        .topline { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
        .id,.period,.type { padding:3px 8px; border-radius:999px; background:#f0ece2; color:#59655f; font-size:11px; }
        h2 { margin:0; font-size:clamp(1.55rem,3vw,2.5rem); line-height:1.08; }
        .lead { max-width:76ch; margin:15px 0 0; font-family:var(--atlas-serif,Georgia,serif); font-size:1.02rem; line-height:1.65; }
        .facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:22px; }
        .fact { padding:15px; border:1px solid #e4dfd4; border-radius:12px; background:#faf8f2; }
        .fact strong { display:block; margin-bottom:5px; color:#1f4642; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
        .fact p { margin:0; color:#4f5c56; font-size:13px; }
        .charts { display:grid; gap:18px; margin-top:22px; }
        .article { margin-top:22px; }
        @media(max-width:680px){ .facts{grid-template-columns:1fr;} }
      </style>
      <section class="surface topic">
        <div class="topline">
          <span class="id">${escapeHtml(item.id)}</span>
          <span class="period">${escapeHtml(period)}</span>
          ${item.type ? `<span class="type">${escapeHtml(item.type)}</span>` : ""}
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        ${item.problem ? `<p class="lead">${escapeHtml(item.problem)}</p>` : ""}
        <div class="facts">
          ${item.mechanism ? `<div class="fact"><strong>Mekanismi</strong><p>${escapeHtml(item.mechanism)}</p></div>` : ""}
          ${item.current_relevance ? `<div class="fact"><strong>Nykymerkitys</strong><p>${escapeHtml(item.current_relevance)}</p></div>` : ""}
        </div>
        ${cards.length ? `<div class="charts">${cards.map(card => `<atlas-stat-card card="${escapeHtml(card)}"></atlas-stat-card>`).join("")}</div>` : ""}
        ${article ? `<div class="article"><atlas-article article="${escapeHtml(article.id)}" compact></atlas-article></div>` : ""}
      </section>`;
  }
}

if (!customElements.get("atlas-topic")) customElements.define("atlas-topic", AtlasTopic);
