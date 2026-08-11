import "./atlas-stat-card.js";
import "./atlas-article.js";
import { fetchJson, resolveUrl, escapeHtml, commonStyles, renderState } from "./atlas-data.js";

function parseList(value) {
  return String(value || "")
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean);
}

function parseInfographics(value) {
  return parseList(value).map((entry, index) => {
    const parts = entry.split("|").map(part => part.trim());
    if (parts.length > 1) return { label: parts[0] || `Infografiikka ${index + 1}`, url: parts.slice(1).join("|") };
    const looksLikeUrl = /^(https?:\/\/|\.\/|\.\.\/|\/)/.test(entry) || /\.(html?|svg|png|jpe?g|webp|pdf)(\?.*)?$/i.test(entry);
    return { label: `Infografiikka ${index + 1}`, url: looksLikeUrl ? entry : null, id: looksLikeUrl ? null : entry };
  });
}

class AtlasTopic extends HTMLElement {
  static observedAttributes = [
    "item", "cards", "infographics", "data-base", "atlas-url", "articles-url",
    "cards-url", "data-url", "appearance",
  ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = null;
    this.activeSection = "summary";
    this.indices = { cards: 0, articles: 0, infographics: 0 };
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
      const item = (atlas.items ?? []).find(entry => String(entry.id) === String(id));
      if (!item) throw new Error(`Murroskohdetta ${id} ei löydy.`);

      const linkedArticleIds = (articleDoc.links ?? [])
        .filter(link => String(link.item_id) === String(id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(link => String(link.article_id));
      const articlesById = new Map((articleDoc.articles ?? []).map(article => [String(article.id), article]));
      const articles = linkedArticleIds.map(articleId => articlesById.get(articleId)).filter(Boolean);
      const cards = parseList(this.getAttribute("cards"));
      const infographics = parseInfographics(this.getAttribute("infographics"));

      this.model = { item, articles, cards, infographics };
      if (!this.sectionAvailable(this.activeSection)) this.activeSection = "summary";
      this.renderTopic();
    } catch (error) {
      console.error("atlas-topic:", error);
      renderState(this.shadowRoot, "error", error.message || "Aihetta ei voitu ladata.");
    }
  }

  sectionAvailable(section) {
    if (!this.model) return false;
    if (section === "summary") return true;
    return (this.model[section] ?? []).length > 0;
  }

  inheritedAttributes() {
    const names = ["data-base", "cards-url", "data-url"];
    return names
      .filter(name => this.hasAttribute(name))
      .map(name => `${name}="${escapeHtml(this.getAttribute(name))}"`)
      .join(" ");
  }

  articleAttributes() {
    const attrs = [];
    if (this.hasAttribute("data-base")) attrs.push(`data-base="${escapeHtml(this.getAttribute("data-base"))}"`);
    if (this.hasAttribute("articles-url")) attrs.push(`articles-url="${escapeHtml(this.getAttribute("articles-url"))}"`);
    return attrs.join(" ");
  }

  renderTopic() {
    const { item, cards, articles, infographics } = this.model;
    const period = item.year_end && item.year_end !== item.year_start
      ? `${item.year_start}–${item.year_end}`
      : `${item.year_start ?? ""}`;
    const frameless = this.getAttribute("appearance") === "frameless";

    const tabs = [
      { id: "summary", label: "Yhteenveto", count: null },
      { id: "cards", label: "Kortit", count: cards.length },
      { id: "articles", label: "Artikkelit", count: articles.length },
      { id: "infographics", label: "Infografiikat", count: infographics.length },
    ].filter(tab => tab.id === "summary" || tab.count > 0);

    this.shadowRoot.innerHTML = `
      <style>
        ${commonStyles()}
        :host([appearance="frameless"]) .topic { padding:10px 0 0; }
        .topic { padding:clamp(20px,4vw,34px); }
        .topline { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
        .id,.period,.type { padding:3px 8px; border-radius:999px; background:#f0ece2; color:#59655f; font-size:11px; }
        :host([appearance="frameless"]) .id,
        :host([appearance="frameless"]) .period,
        :host([appearance="frameless"]) .type { background:transparent; padding-left:0; padding-right:10px; }
        h2 { margin:0; font-size:clamp(1.55rem,3vw,2.5rem); line-height:1.08; }
        .lead { max-width:76ch; margin:15px 0 0; font-family:var(--atlas-serif,Georgia,serif); font-size:1.02rem; line-height:1.65; }
        .facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:22px; }
        .fact { padding:15px; border:1px solid #e4dfd4; border-radius:12px; background:#faf8f2; }
        :host([appearance="frameless"]) .fact { padding:13px 0; border:0; border-top:1px solid #e4dfd4; border-radius:0; background:transparent; }
        .fact strong { display:block; margin-bottom:5px; color:#1f4642; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
        .fact p { margin:0; color:#4f5c56; font-size:13px; }
        .content-nav { display:flex; align-items:center; gap:20px; margin:24px 0 16px; border-bottom:1px solid #ded8ca; overflow-x:auto; scrollbar-width:none; }
        .content-nav::-webkit-scrollbar { display:none; }
        .content-tab { position:relative; flex:none; padding:9px 0 10px; border:0; background:transparent; color:#68736e; cursor:pointer; font:600 11px/1 var(--atlas-sans,-apple-system,sans-serif); letter-spacing:.06em; text-transform:uppercase; }
        .content-tab b { margin-left:4px; font-weight:500; opacity:.62; }
        .content-tab.active { color:#1f4642; }
        .content-tab.active::after { content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; background:#b56a34; }
        .panel { min-height:160px; }
        .browser-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
        .browser-meta { color:#68736e; font:500 10px var(--atlas-mono,monospace); letter-spacing:.08em; text-transform:uppercase; }
        .browser-arrows { display:flex; align-items:center; gap:8px; }
        .arrow { width:34px; height:30px; border:0; border-bottom:1px solid #cfc8bb; background:transparent; color:#1f4642; cursor:pointer; font-size:18px; line-height:1; }
        .arrow:disabled { opacity:.25; cursor:default; }
        .counter { min-width:46px; text-align:center; color:#68736e; font:500 10px var(--atlas-mono,monospace); }
        .content-stage { min-width:0; }
        atlas-stat-card, atlas-article { display:block; width:100%; }
        .infographic { min-height:280px; }
        .infographic iframe { display:block; width:100%; min-height:560px; border:0; background:transparent; }
        .infographic img { display:block; max-width:100%; height:auto; margin:auto; }
        .infographic-link { display:inline-flex; align-items:center; gap:8px; padding:10px 0; color:#1f4642; font-weight:650; text-decoration:none; border-bottom:1px solid #b56a34; }
        .empty { padding:24px 0; color:#7a837f; font-size:13px; }
        @media(max-width:680px){ .facts{grid-template-columns:1fr;} .content-nav{gap:15px}.browser-head{align-items:flex-start}.infographic iframe{min-height:420px} }
      </style>
      <section class="surface topic">
        <div class="topline">
          <span class="id">${escapeHtml(item.id)}</span>
          <span class="period">${escapeHtml(period)}</span>
          ${item.type ? `<span class="type">${escapeHtml(item.type)}</span>` : ""}
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        ${item.problem ? `<p class="lead">${escapeHtml(item.problem)}</p>` : ""}
        <nav class="content-nav" aria-label="Aiheen sisältö">
          ${tabs.map(tab => `<button type="button" class="content-tab ${this.activeSection === tab.id ? "active" : ""}" data-section="${tab.id}">${tab.label}${tab.count != null ? `<b>${tab.count}</b>` : ""}</button>`).join("")}
        </nav>
        <div class="panel" id="panel"></div>
      </section>`;

    this.shadowRoot.querySelectorAll("[data-section]").forEach(button => {
      button.addEventListener("click", () => {
        this.activeSection = button.dataset.section;
        this.shadowRoot.querySelectorAll("[data-section]").forEach(tab => tab.classList.toggle("active", tab === button));
        this.renderPanel();
      });
    });

    this.renderPanel();
    if (frameless) queueMicrotask(() => this.propagateAppearance());
  }

  renderPanel() {
    const panel = this.shadowRoot.querySelector("#panel");
    if (!panel || !this.model) return;
    const { item, cards, articles, infographics } = this.model;

    if (this.activeSection === "summary") {
      panel.innerHTML = `<div class="facts">
        ${item.mechanism ? `<div class="fact"><strong>Mekanismi</strong><p>${escapeHtml(item.mechanism)}</p></div>` : ""}
        ${item.current_relevance ? `<div class="fact"><strong>Nykymerkitys</strong><p>${escapeHtml(item.current_relevance)}</p></div>` : ""}
        ${item.consequences ? `<div class="fact"><strong>Seuraukset</strong><p>${escapeHtml(item.consequences)}</p></div>` : ""}
        ${item.long_term_effect ? `<div class="fact"><strong>Pitkä vaikutus</strong><p>${escapeHtml(item.long_term_effect)}</p></div>` : ""}
      </div>`;
      return;
    }

    const collection = this.model[this.activeSection] ?? [];
    if (!collection.length) {
      panel.innerHTML = `<div class="empty">Tähän aiheeseen ei ole vielä liitetty sisältöä.</div>`;
      return;
    }

    const maxIndex = collection.length - 1;
    this.indices[this.activeSection] = Math.max(0, Math.min(this.indices[this.activeSection] ?? 0, maxIndex));
    const index = this.indices[this.activeSection];
    const label = this.activeSection === "cards" ? "Tilastokortti" : this.activeSection === "articles" ? "Artikkeli" : "Infografiikka";

    panel.innerHTML = `
      <div class="browser-head">
        <div class="browser-meta">${label}</div>
        <div class="browser-arrows">
          <button class="arrow prev" type="button" aria-label="Edellinen">←</button>
          <span class="counter">${index + 1} / ${collection.length}</span>
          <button class="arrow next" type="button" aria-label="Seuraava">→</button>
        </div>
      </div>
      <div class="content-stage"></div>`;

    const prev = panel.querySelector(".prev");
    const next = panel.querySelector(".next");
    prev.disabled = collection.length <= 1;
    next.disabled = collection.length <= 1;
    prev.addEventListener("click", () => this.shift(-1));
    next.addEventListener("click", () => this.shift(1));
    this.renderStage();
  }

  shift(delta) {
    const collection = this.model?.[this.activeSection] ?? [];
    if (collection.length <= 1) return;
    const current = this.indices[this.activeSection] ?? 0;
    this.indices[this.activeSection] = (current + delta + collection.length) % collection.length;
    this.renderPanel();
  }

  renderStage() {
    const stage = this.shadowRoot.querySelector(".content-stage");
    if (!stage || !this.model) return;
    const index = this.indices[this.activeSection] ?? 0;

    if (this.activeSection === "cards") {
      const card = this.model.cards[index];
      stage.innerHTML = `<atlas-stat-card card="${escapeHtml(card)}" ${this.inheritedAttributes()}></atlas-stat-card>`;
    } else if (this.activeSection === "articles") {
      const article = this.model.articles[index];
      stage.innerHTML = `<atlas-article article="${escapeHtml(article.id)}" compact ${this.articleAttributes()}></atlas-article>`;
    } else if (this.activeSection === "infographics") {
      const infographic = this.model.infographics[index];
      stage.innerHTML = this.renderInfographic(infographic);
    }

    this.propagateAppearance();
  }

  renderInfographic(infographic) {
    if (!infographic) return "";
    if (!infographic.url) {
      return `<div class="infographic"><div class="empty"><strong>${escapeHtml(infographic.label)}</strong><br>Infografiikan tunnus: ${escapeHtml(infographic.id || "")}</div></div>`;
    }
    const raw = infographic.url;
    let url;
    try { url = new URL(raw, this.getAttribute("data-base") || document.baseURI).href; }
    catch { url = raw; }
    if (/\.(png|jpe?g|webp|svg)(\?.*)?$/i.test(url)) {
      return `<figure class="infographic"><img src="${escapeHtml(url)}" alt="${escapeHtml(infographic.label)}"></figure>`;
    }
    if (/\.pdf(\?.*)?$/i.test(url)) {
      return `<div class="infographic"><a class="infographic-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(infographic.label)} ↗</a></div>`;
    }
    return `<div class="infographic"><iframe src="${escapeHtml(url)}" title="${escapeHtml(infographic.label)}" loading="lazy"></iframe></div>`;
  }

  propagateAppearance() {
    if (this.getAttribute("appearance") !== "frameless") return;
    this.shadowRoot.querySelectorAll("atlas-stat-card, atlas-article").forEach(element => element.setAttribute("appearance", "frameless"));
  }
}

if (!customElements.get("atlas-topic")) customElements.define("atlas-topic", AtlasTopic);
