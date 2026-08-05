import { fetchJson, resolveUrl, escapeHtml, commonStyles, renderState } from "./atlas-data.js";

class AtlasTimeline extends HTMLElement {
  static observedAttributes = ["items", "domain", "limit", "data-base", "atlas-url"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.load(); }
  attributeChangedCallback() { if (this.isConnected) this.load(); }

  async load() {
    renderState(this.shadowRoot, "loading", "Ladataan aikajanaa…");
    try {
      const atlas = await fetchJson(resolveUrl(this, "atlas-url", "murrosatlas.json"));
      const ids = (this.getAttribute("items") || "").split(",").map(v => v.trim()).filter(Boolean);
      const domain = this.getAttribute("domain");
      const limit = Math.max(1, Number(this.getAttribute("limit") || 12));
      let rows = atlas.items ?? [];
      if (ids.length) rows = rows.filter(item => ids.includes(item.id));
      if (domain) rows = rows.filter(item => (item.domains ?? []).includes(domain));
      rows = [...rows].sort((a, b) => (a.year_start ?? 0) - (b.year_start ?? 0)).slice(0, limit);
      this.renderTimeline(rows);
    } catch (error) {
      console.error("atlas-timeline:", error);
      renderState(this.shadowRoot, "error", error.message || "Aikajanaa ei voitu ladata.");
    }
  }

  renderTimeline(items) {
    this.shadowRoot.innerHTML = `
      <style>
        ${commonStyles()}
        .wrap { padding:22px; }
        h2 { margin:0 0 18px; font-size:1.45rem; }
        ol { position:relative; list-style:none; margin:0; padding:0 0 0 24px; }
        ol::before { content:""; position:absolute; left:7px; top:8px; bottom:8px; width:2px; background:#d9d3c6; }
        li { position:relative; padding:0 0 20px 18px; }
        li:last-child { padding-bottom:0; }
        li::before { content:""; position:absolute; left:-22px; top:7px; width:11px; height:11px; border-radius:50%; background:#2f6f68; border:3px solid var(--atlas-paper,#fdfcf7); box-shadow:0 0 0 1px #2f6f68; }
        .year { color:#b56a34; font-size:12px; font-weight:700; }
        h3 { margin:2px 0 5px; font-size:1.05rem; }
        p { margin:0; color:#5c6862; font-size:13px; line-height:1.5; }
      </style>
      <section class="surface wrap">
        <h2><slot name="title">Rakennemuutosten aikajana</slot></h2>
        ${items.length ? `<ol>${items.map(item => `<li><div class="year">${escapeHtml(item.year_start)}${item.year_end && item.year_end !== item.year_start ? `–${escapeHtml(item.year_end)}` : ""}</div><h3>${escapeHtml(item.title)}</h3>${item.current_relevance ? `<p>${escapeHtml(item.current_relevance)}</p>` : ""}</li>`).join("")}</ol>` : `<p>Valinnalla ei löytynyt kohteita.</p>`}
      </section>`;
  }
}

if (!customElements.get("atlas-timeline")) customElements.define("atlas-timeline", AtlasTimeline);
