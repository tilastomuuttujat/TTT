import { fetchJson, resolveUrl, escapeHtml, commonStyles, renderState } from "./atlas-data.js";

class AtlasNetwork extends HTMLElement {
  static observedAttributes = ["focus", "depth", "data-base", "atlas-url"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = null;
    this.resizeObserver = new ResizeObserver(() => this.draw());
  }

  connectedCallback() {
    this.resizeObserver.observe(this);
    this.load();
  }

  disconnectedCallback() { this.resizeObserver.disconnect(); }
  attributeChangedCallback() { if (this.isConnected) this.load(); }

  async load() {
    const focus = this.getAttribute("focus");
    if (!focus) return renderState(this.shadowRoot, "error", "Verkon focus-tunnus puuttuu.");
    renderState(this.shadowRoot, "loading", "Ladataan verkkoa…");

    try {
      const atlas = await fetchJson(resolveUrl(this, "atlas-url", "murrosatlas.json"));
      const itemMap = new Map((atlas.items ?? []).map(item => [item.id, item]));
      if (!itemMap.has(focus)) throw new Error(`Murroskohdetta ${focus} ei löydy.`);
      const depth = Math.max(1, Math.min(3, Number(this.getAttribute("depth") || 1)));
      const selected = new Set([focus]);
      let frontier = new Set([focus]);
      for (let level = 0; level < depth; level += 1) {
        const next = new Set();
        for (const relation of atlas.relations ?? []) {
          if (frontier.has(relation.from)) next.add(relation.to);
          if (frontier.has(relation.to)) next.add(relation.from);
        }
        for (const id of next) selected.add(id);
        frontier = next;
      }
      const nodes = [...selected].map(id => itemMap.get(id)).filter(Boolean).slice(0, 18);
      const nodeIds = new Set(nodes.map(node => node.id));
      const links = (atlas.relations ?? []).filter(link => nodeIds.has(link.from) && nodeIds.has(link.to));
      this.model = { focus, nodes, links };
      this.renderShell();
      this.draw();
    } catch (error) {
      console.error("atlas-network:", error);
      renderState(this.shadowRoot, "error", error.message || "Verkkoa ei voitu ladata.");
    }
  }

  renderShell() {
    const focusItem = this.model.nodes.find(node => node.id === this.model.focus);
    this.shadowRoot.innerHTML = `
      <style>
        ${commonStyles()}
        .wrap { padding:20px; }
        h2 { margin:0; font-size:1.35rem; }
        .sub { margin:5px 0 12px; color:#66716b; font-size:12px; }
        svg { display:block; width:100%; min-height:420px; border-radius:12px; background:#faf8f2; }
        .link { stroke:#c8c1b4; stroke-width:1.4; }
        .node { fill:#2f6f68; stroke:#fffdf7; stroke-width:3; }
        .focus { fill:#b56a34; }
        text { fill:#26332f; font:11px var(--atlas-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); pointer-events:none; }
      </style>
      <section class="surface wrap">
        <h2>${escapeHtml(focusItem?.title || this.model.focus)}</h2>
        <p class="sub">Lähimmät yhteydet murrosatlaksessa</p>
        <svg role="img" aria-label="${escapeHtml(focusItem?.title || this.model.focus)} – yhteysverkko"></svg>
      </section>`;
  }

  draw() {
    if (!this.model) return;
    const svg = this.shadowRoot.querySelector("svg");
    if (!svg) return;
    const width = Math.max(360, svg.clientWidth || 760);
    const height = 430;
    const cx = width / 2;
    const cy = height / 2;
    const focusNode = this.model.nodes.find(node => node.id === this.model.focus);
    const others = this.model.nodes.filter(node => node.id !== this.model.focus);
    const radius = Math.min(width, height) * .34;
    const positions = new Map([[this.model.focus, { x: cx, y: cy }]]);
    others.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, others.length);
      positions.set(node.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    });

    const links = this.model.links.map(link => {
      const a = positions.get(link.from);
      const b = positions.get(link.to);
      if (!a || !b) return "";
      return `<line class="link" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"><title>${escapeHtml(link.type || link.rel_class || "yhteys")}</title></line>`;
    }).join("");

    const nodes = this.model.nodes.map(node => {
      const p = positions.get(node.id);
      const isFocus = node.id === this.model.focus;
      const label = node.title.length > 30 ? `${node.title.slice(0, 28)}…` : node.title;
      return `<g><circle class="node ${isFocus ? "focus" : ""}" cx="${p.x}" cy="${p.y}" r="${isFocus ? 12 : 8}"><title>${escapeHtml(node.title)}</title></circle><text x="${p.x}" y="${p.y + (isFocus ? 27 : 22)}" text-anchor="middle">${escapeHtml(label)}</text></g>`;
    }).join("");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `${links}${nodes}`;
  }
}

if (!customElements.get("atlas-network")) customElements.define("atlas-network", AtlasNetwork);
