import "./atlas-stat-card.js";
import "./atlas-article.js";
import { fetchJson, escapeHtml } from "./atlas-data.js";

const MODULE_URL = new URL(import.meta.url);
const BASE_URL = new URL("../", MODULE_URL);

const CARD_RULES = [
  { test: /velka|julkinen talous|talouskriisi|rahoitus/i, cards: ["JULKINEN_VELKA_POLKU"] },
  { test: /työttö|lama/i, cards: ["TYOTTOMYYS_1990_2024", "JULKINEN_VELKA_POLKU"] },
  { test: /työ|työllisy/i, cards: ["TYOLLISYYS_POLKU", "TYOTTOMYYS_1990_2024"] },
  { test: /ikäänty|huoltosuhde|väestö/i, cards: ["VAESTON_IKAANTYMINEN", "SYNTYVYYS_MURROS"] },
  { test: /syntyv/i, cards: ["SYNTYVYYS_MURROS"] },
  { test: /kaupun|alue|muutto/i, cards: ["RAKENNEMUUTOS_KAUPUNGISTUMINEN"] },
];

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function norm(value) { return String(value ?? "").toLocaleLowerCase("fi-FI"); }

function inferCards(item) {
  const explicit = Array.isArray(item?.cards) ? item.cards : Array.isArray(item?.visualizations) ? item.visualizations : [];
  const haystack = [item?.id, item?.title, item?.type, ...(item?.domains ?? []), ...(item?.tags ?? [])].join(" ");
  const inferred = CARD_RULES.flatMap(rule => rule.test.test(haystack) ? rule.cards : []);
  return unique([...explicit, ...inferred]);
}

class AtlasContentBrowser extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.item = null;
    this.sections = [];
    this.sectionIndex = 0;
    this.itemIndex = 0;
  }

  connectedCallback() {
    if (this.item) this.load(this.item);
  }

  async load(item) {
    this.item = item;
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="loading">Ladataan sisältöjä…</div>`;
    try {
      const [articleDoc, cardsDoc] = await Promise.all([
        fetchJson(new URL("artikkelit.json", BASE_URL)),
        fetchJson(new URL("visualization-cards.json", BASE_URL)),
      ]);

      const linkedIds = (articleDoc.links ?? [])
        .filter(link => String(link.item_id) === String(item.id))
        .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(link => link.article_id);
      const articles = (articleDoc.articles ?? []).filter(article => linkedIds.includes(article.id));
      const cardIds = inferCards(item);
      const cards = (cardsDoc.cards ?? []).filter(card => cardIds.includes(card.id));
      const infographics = articles.flatMap(article => (article.images ?? []).map((image, index) => ({
        id: `${article.id}:${index}`,
        title: image.caption || article.title,
        url: image.url,
        articleTitle: article.title,
      })));

      this.sections = [
        { key:"cards", label:"Kortit", items:cards },
        { key:"articles", label:"Artikkelit", items:articles },
        { key:"infographics", label:"Infografiikat", items:infographics },
      ].filter(section => section.items.length);
      this.sectionIndex = Math.min(this.sectionIndex, Math.max(0, this.sections.length - 1));
      this.itemIndex = 0;
      this.render();
    } catch (error) {
      console.error("atlas-content-browser:", error);
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="error">Sisältöjä ei voitu ladata.</div>`;
    }
  }

  styles() {
    return `
      :host{display:block;font-family:var(--atlas-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--atlas-ink,#172421)}
      *{box-sizing:border-box} button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
      .browser{border-top:1px solid var(--atlas-line,#ded8ca);margin-top:16px;padding-top:14px}
      .tabs{display:flex;flex-wrap:wrap;gap:18px;align-items:center;border-bottom:1px solid rgba(222,216,202,.72)}
      .tab{position:relative;padding:8px 0 10px;color:#68736e;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase}
      .tab.active{color:#1f4642}.tab.active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#b56a34}
      .tab small{margin-left:5px;color:#9a8675;font-size:9px}
      .nav{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0 8px}
      .nav button{padding:4px 7px;color:#2f6f68;font-size:18px;line-height:1}.nav button:disabled{opacity:.25;cursor:default}
      .count{font:500 10px var(--atlas-mono,monospace);color:#79847e;letter-spacing:.08em}
      .content{min-height:140px}.empty,.loading,.error{padding:18px 0;color:#6c766f;font-size:13px}.error{color:#9b392c}
      atlas-stat-card,atlas-article{display:block}
      .graphic{margin:0}.graphic img{display:block;width:100%;max-height:min(68vh,760px);object-fit:contain;background:transparent}
      .graphic figcaption{padding:9px 0;color:#5d6862;font-size:12px;line-height:1.45}
      .article-title{font-family:var(--atlas-serif,Georgia,serif);font-size:1rem;color:#1f4642}
    `;
  }

  render() {
    if (!this.sections.length) {
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="empty">Tälle murrokselle ei löytynyt vielä kortteja, artikkeleita tai infografiikoita.</div>`;
      return;
    }
    const section = this.sections[this.sectionIndex];
    this.itemIndex = Math.max(0, Math.min(this.itemIndex, section.items.length - 1));
    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <section class="browser" aria-label="Murroksen sisältöselaus">
        <nav class="tabs">${this.sections.map((s,i)=>`<button class="tab ${i===this.sectionIndex?"active":""}" data-section="${i}">${escapeHtml(s.label)}<small>${s.items.length}</small></button>`).join("")}</nav>
        <div class="nav"><button class="prev" aria-label="Edellinen">‹</button><span class="count">${this.itemIndex+1} / ${section.items.length}</span><button class="next" aria-label="Seuraava">›</button></div>
        <div class="content"></div>
      </section>`;
    this.shadowRoot.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => {
      this.sectionIndex = Number(button.dataset.section); this.itemIndex = 0; this.render();
    }));
    this.shadowRoot.querySelector(".prev").addEventListener("click", () => { this.itemIndex = (this.itemIndex - 1 + section.items.length) % section.items.length; this.render(); });
    this.shadowRoot.querySelector(".next").addEventListener("click", () => { this.itemIndex = (this.itemIndex + 1) % section.items.length; this.render(); });
    this.renderContent(section);
  }

  renderContent(section) {
    const mount = this.shadowRoot.querySelector(".content");
    const current = section.items[this.itemIndex];
    if (!current) return;
    if (section.key === "cards") {
      const el = document.createElement("atlas-stat-card");
      el.setAttribute("card", current.id);
      el.setAttribute("appearance", "frameless");
      mount.replaceChildren(el);
    } else if (section.key === "articles") {
      const el = document.createElement("atlas-article");
      el.setAttribute("article", current.id);
      el.setAttribute("compact", "");
      el.setAttribute("appearance", "frameless");
      mount.replaceChildren(el);
    } else {
      mount.innerHTML = `<figure class="graphic"><img src="${escapeHtml(current.url)}" alt="${escapeHtml(current.title || current.articleTitle || "Infografiikka")}" loading="lazy"><figcaption><span class="article-title">${escapeHtml(current.title || "Infografiikka")}</span>${current.articleTitle && current.articleTitle !== current.title ? `<br>${escapeHtml(current.articleTitle)}` : ""}</figcaption></figure>`;
    }
  }
}

if (!customElements.get("atlas-content-browser")) customElements.define("atlas-content-browser", AtlasContentBrowser);

function ensureDrawer() {
  let drawer = document.getElementById("atlas-content-drawer");
  if (drawer) return drawer;
  drawer = document.createElement("aside");
  drawer.id = "atlas-content-drawer";
  drawer.hidden = true;
  drawer.innerHTML = `<div class="atlas-content-drawer-inner"><button class="atlas-content-close" type="button" aria-label="Sulje">×</button><div class="atlas-content-head"><div class="atlas-content-kicker">Murroksen sisältö</div><h3 class="atlas-content-title"></h3></div><atlas-content-browser></atlas-content-browser></div>`;
  const style = document.createElement("style");
  style.textContent = `#atlas-content-drawer{position:fixed;inset:0 0 0 auto;z-index:9998;width:min(680px,92vw);background:rgba(247,244,238,.985);box-shadow:-24px 0 70px rgba(13,42,44,.18);overflow:auto;border-left:1px solid #ddd6c9}#atlas-content-drawer[hidden]{display:none}.atlas-content-drawer-inner{position:relative;padding:22px 28px 34px}.atlas-content-close{position:sticky;top:10px;z-index:2;float:right;width:36px;height:36px;border:1px solid #ddd6c9;border-radius:50%;background:#f7f4ee;color:#0d2a2c;font-size:24px;line-height:1;cursor:pointer}.atlas-content-head{padding:8px 52px 8px 0}.atlas-content-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#7a837f}.atlas-content-title{margin:5px 0 0;font:500 clamp(1.25rem,2.3vw,1.9rem)/1.15 Fraunces,Georgia,serif;color:#1f4642}@media(max-width:680px){#atlas-content-drawer{width:100vw}.atlas-content-drawer-inner{padding:18px}}`;
  document.head.appendChild(style);
  document.body.appendChild(drawer);
  drawer.querySelector(".atlas-content-close").addEventListener("click", () => { drawer.hidden = true; });
  return drawer;
}

document.addEventListener("atlas-open-item", event => {
  const item = event.detail?.item;
  if (!item) return;
  const drawer = ensureDrawer();
  drawer.querySelector(".atlas-content-title").textContent = item.title ?? item.id;
  drawer.hidden = false;
  drawer.querySelector("atlas-content-browser").load(item);
});

export { AtlasContentBrowser };
