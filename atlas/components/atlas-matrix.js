import {
  fetchJson,
  resolveUrl,
  escapeHtml,
  commonStyles,
  renderState,
} from "./atlas-data.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function yearLabel(item) {
  const start = item.year_start ?? "";
  const end = item.year_end;
  return end && end !== start ? `${start}–${end}` : `${start}`;
}

function primaryDomain(item, domainOrder) {
  const domains = Array.isArray(item.domains) ? item.domains : [];
  return domains.find((domain) => domainOrder.includes(domain)) ?? domains[0] ?? "muu";
}

class AtlasMatrix extends HTMLElement {
  static observedAttributes = [
    "data-base",
    "atlas-url",
    "from",
    "to",
    "domains",
    "depth",
    "limit-domains",
  ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = null;
    this.selectedId = null;
    this.direction = "both";
    this.depth = 2;
    this.resizeObserver = new ResizeObserver(() => this.drawLinks());
  }

  connectedCallback() {
    this.resizeObserver.observe(this);
    this.load();
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.load();
  }

  async load() {
    renderState(this.shadowRoot, "loading", "Ladataan rakennematriisia…");

    try {
      const atlas = await fetchJson(resolveUrl(this, "atlas-url", "murrosatlas.json"));
      const allItems = (atlas.items ?? []).filter((item) => Number.isFinite(Number(item.year_start)));
      const relations = atlas.relations ?? [];

      if (!allItems.length) {
        throw new Error("Murrosatlaksessa ei ole matriisiin sijoitettavia kohteita.");
      }

      const minDataYear = Math.min(...allItems.map((item) => Number(item.year_start)));
      const maxDataYear = Math.max(...allItems.map((item) => Number(item.year_start)));
      const from = Number(this.getAttribute("from") ?? minDataYear);
      const to = Number(this.getAttribute("to") ?? maxDataYear);
      const requestedDomains = (this.getAttribute("domains") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const limitDomains = clamp(Number(this.getAttribute("limit-domains") || 10), 3, 20);

      const items = allItems.filter((item) => {
        const year = Number(item.year_start);
        return year >= from && year <= to;
      });

      const counts = new Map();
      for (const item of items) {
        for (const domain of item.domains ?? ["muu"]) {
          counts.set(domain, (counts.get(domain) ?? 0) + 1);
        }
      }

      const domains = requestedDomains.length
        ? requestedDomains
        : [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "fi"))
            .slice(0, limitDomains)
            .map(([domain]) => domain);

      if (!domains.includes("muu")) domains.push("muu");

      this.depth = clamp(Number(this.getAttribute("depth") || 2), 1, 3);
      this.model = { items, relations, domains, from, to };
      this.renderShell();
      this.renderMatrix();
    } catch (error) {
      console.error("atlas-matrix:", error);
      renderState(
        this.shadowRoot,
        "error",
        error.message || "Rakennematriisia ei voitu ladata."
      );
    }
  }

  styles() {
    return `
      ${commonStyles()}
      :host { --matrix-cell: clamp(13px, 1.55vw, 22px); }
      button { font: inherit; color: inherit; }
      .wrap { padding: clamp(17px, 3vw, 26px); }
      .head { display:flex; justify-content:space-between; gap:18px; align-items:flex-end; }
      h2 { margin:0; font-size:clamp(1.45rem,3vw,2.2rem); line-height:1.05; }
      .intro { max-width:72ch; margin:7px 0 0; color:#66716b; font-size:13px; }
      .stats { display:flex; gap:16px; flex-shrink:0; }
      .stat { text-align:right; color:#6c766f; font-size:9px; text-transform:uppercase; letter-spacing:.1em; }
      .stat strong { display:block; color:#1f4642; font:600 1.45rem var(--atlas-serif,Georgia,serif); line-height:1; }
      .tools { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:18px 0 12px; }
      .group { display:flex; align-items:center; gap:3px; padding:3px; border:1px solid #ded8ca; border-radius:999px; background:#fdfcf7; }
      .group > span { padding-left:7px; color:#6c766f; font-size:9px; text-transform:uppercase; letter-spacing:.11em; }
      .chip,.reset { border:0; padding:6px 9px; border-radius:999px; background:transparent; color:#65716b; cursor:pointer; font-size:10px; }
      .chip.active { background:#1f4642; color:#fffdf7; }
      .reset { margin-left:auto; border:1px solid #ded8ca; }
      .selection { display:none; margin:0 0 12px; padding:10px 12px; border-left:3px solid #b56a34; background:#f7f4ec; border-radius:0 9px 9px 0; }
      .selection.visible { display:block; }
      .selection strong { font-family:var(--atlas-serif,Georgia,serif); }
      .selection small { display:block; margin-top:2px; color:#6c766f; }
      .scroller { overflow:auto; border:1px solid #ded8ca; border-radius:13px; background:#fdfcf7; }
      .matrix { position:relative; display:grid; min-width:760px; }
      .corner,.year,.label { position:sticky; z-index:4; background:#f7f4ec; }
      .corner { left:0; top:0; border-right:1px solid #ded8ca; border-bottom:1px solid #ded8ca; }
      .year { top:0; min-width:var(--matrix-cell); padding:7px 1px; border-bottom:1px solid #ded8ca; color:#6c766f; font-size:8px; text-align:center; }
      .label { left:0; display:flex; align-items:center; min-width:130px; padding:5px 9px; border-right:1px solid #ded8ca; border-bottom:1px solid rgba(222,216,202,.7); color:#1f4642; font-size:10px; font-weight:650; }
      .cell { position:relative; min-width:var(--matrix-cell); min-height:var(--matrix-cell); border-right:1px solid rgba(226,220,206,.34); border-bottom:1px solid rgba(226,220,206,.34); }
      .cell:nth-child(5n) { background:rgba(58,107,100,.025); }
      .node { position:absolute; inset:2px; z-index:3; border:0; border-radius:2px; background:linear-gradient(150deg,#4a9088,#1f4642); outline:1px solid rgba(253,252,247,.7); cursor:pointer; transition:opacity .2s,filter .2s,transform .2s; }
      .node:hover { z-index:8; filter:brightness(1.18); transform:scale(1.25); }
      .node.selected { background:linear-gradient(150deg,#f1c36d,#b56a34); outline:2px solid #12332f; }
      .node.predecessor { background:linear-gradient(150deg,#2f6b64,#12332f); }
      .node.successor { background:linear-gradient(150deg,#d69642,#b56a34); }
      .node.mixed { background:linear-gradient(150deg,#967eaa,#79608d); }
      .node.unrelated { opacity:.13; }
      .node.depth-2 { opacity:.72; }
      .node.depth-3 { opacity:.48; }
      .links { position:absolute; inset:0; z-index:2; pointer-events:none; overflow:visible; }
      .link { stroke:rgba(31,70,66,.15); stroke-width:1; }
      .link.active { stroke:rgba(181,106,52,.8); stroke-width:2; }
      .legend { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; color:#66716b; font-size:10px; }
      .legend span { display:inline-flex; align-items:center; gap:5px; }
      .legend i { width:10px; height:10px; border-radius:2px; background:#2f6f68; }
      .legend .before { background:#12332f; }
      .legend .after { background:#b56a34; }
      .legend .mixed { background:#79608d; }
      .tooltip { position:fixed; z-index:9999; display:none; max-width:280px; padding:8px 10px; border-radius:8px; background:#1f4642; color:#fffdf7; pointer-events:none; box-shadow:0 12px 30px rgba(0,0,0,.2); }
      .tooltip.visible { display:block; }
      .tooltip small { color:#d69642; }
      @media(max-width:720px){ .head{display:block}.stats{margin-top:14px}.reset{margin-left:0} }
    `;
  }

  renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <section class="surface wrap">
        <div class="head">
          <div>
            <h2><slot name="title">Murrosten rakennematriisi</slot></h2>
            <p class="intro">Vaaka-akseli näyttää ajan ja pystyakseli rakenteellisen teeman. Valitse ruutu nähdäksesi dokumentoidut edeltäjät ja seuraajat.</p>
          </div>
          <div class="stats">
            <div class="stat"><strong id="visible">–</strong>murrosta</div>
            <div class="stat"><strong id="span">–</strong>vuotta</div>
          </div>
        </div>
        <div class="tools">
          <div class="group">
            <span>Suunta</span>
            <button class="chip active" data-direction="both">Molemmat</button>
            <button class="chip" data-direction="in">Edeltäjät</button>
            <button class="chip" data-direction="out">Seuraajat</button>
          </div>
          <div class="group">
            <span>Syvyys</span>
            <button class="chip" data-depth="1">1</button>
            <button class="chip active" data-depth="2">2</button>
            <button class="chip" data-depth="3">3</button>
          </div>
          <button class="reset" type="button">Palauta kokonaiskuva</button>
        </div>
        <div class="selection" aria-live="polite"></div>
        <div class="scroller">
          <div class="matrix"><svg class="links"></svg></div>
        </div>
        <div class="legend">
          <span><i></i> murros</span>
          <span><i class="before"></i> edeltäjä</span>
          <span><i class="after"></i> seuraaja</span>
          <span><i class="mixed"></i> molemmat</span>
        </div>
      </section>
      <div class="tooltip"></div>`;

    this.shadowRoot.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", () => {
        this.direction = button.dataset.direction;
        this.shadowRoot.querySelectorAll("[data-direction]").forEach((item) => item.classList.toggle("active", item === button));
        this.applySelection();
      });
    });

    this.shadowRoot.querySelectorAll("[data-depth]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.depth) === this.depth);
      button.addEventListener("click", () => {
        this.depth = Number(button.dataset.depth);
        this.shadowRoot.querySelectorAll("[data-depth]").forEach((item) => item.classList.toggle("active", item === button));
        this.applySelection();
      });
    });

    this.shadowRoot.querySelector(".reset").addEventListener("click", () => {
      this.selectedId = null;
      this.applySelection();
    });
  }

  renderMatrix() {
    const { items, domains, from, to } = this.model;
    const matrix = this.shadowRoot.querySelector(".matrix");
    const binSize = Math.max(5, Math.ceil((to - from + 1) / 60));
    const years = [];
    for (let year = Math.floor(from / binSize) * binSize; year <= to; year += binSize) years.push(year);

    matrix.style.gridTemplateColumns = `130px repeat(${years.length}, minmax(var(--matrix-cell), 1fr))`;
    matrix.style.gridTemplateRows = `28px repeat(${domains.length}, var(--matrix-cell))`;

    const fragments = ["<div class=\"corner\"></div>"];
    years.forEach((year, index) => {
      const show = index === 0 || index === years.length - 1 || index % Math.max(1, Math.ceil(years.length / 8)) === 0;
      fragments.push(`<div class="year">${show ? year : ""}</div>`);
    });

    domains.forEach((domain, rowIndex) => {
      fragments.push(`<div class="label">${escapeHtml(domain)}</div>`);
      years.forEach((year, colIndex) => {
        fragments.push(`<div class="cell" data-row="${rowIndex}" data-col="${colIndex}" data-domain="${escapeHtml(domain)}" data-year="${year}"></div>`);
      });
    });

    const svg = matrix.querySelector(".links");
    matrix.innerHTML = `${svg.outerHTML}${fragments.join("")}`;

    const occupied = new Map();
    const domainOrder = domains.filter((domain) => domain !== "muu");

    for (const item of items) {
      const domain = primaryDomain(item, domainOrder);
      const row = Math.max(0, domains.indexOf(domain));
      const col = clamp(Math.round((Number(item.year_start) - years[0]) / binSize), 0, years.length - 1);
      let cell = matrix.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      const key = `${row}:${col}`;
      const stack = occupied.get(key) ?? 0;
      occupied.set(key, stack + 1);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "node";
      button.dataset.id = item.id;
      button.setAttribute("aria-label", `${item.title}, ${yearLabel(item)}`);
      button.style.transform = `translate(${Math.min(stack, 3) * 2}px, ${Math.min(stack, 3) * -2}px)`;
      button.addEventListener("click", () => {
        if (this.selectedId === item.id) {
          this.dispatchEvent(new CustomEvent("atlas-open-item", { detail: { item }, bubbles: true, composed: true }));
        } else {
          this.selectedId = item.id;
          this.applySelection();
        }
      });
      button.addEventListener("pointerenter", (event) => this.showTooltip(event, item));
      button.addEventListener("pointermove", (event) => this.moveTooltip(event));
      button.addEventListener("pointerleave", () => this.hideTooltip());
      cell.appendChild(button);
    }

    this.shadowRoot.getElementById("visible").textContent = items.length;
    this.shadowRoot.getElementById("span").textContent = Math.max(0, to - from);
    this.grid = { years, binSize };
    requestAnimationFrame(() => this.drawLinks());
  }

  relationNeighborhood() {
    if (!this.selectedId) return new Map();
    const { relations } = this.model;
    const distances = new Map([[this.selectedId, { depth: 0, in: false, out: false }]]);
    let frontier = new Set([this.selectedId]);

    for (let level = 1; level <= this.depth; level += 1) {
      const next = new Set();
      for (const relation of relations) {
        if ((this.direction === "both" || this.direction === "out") && frontier.has(relation.from)) {
          const old = distances.get(relation.to) ?? { depth: level, in: false, out: false };
          distances.set(relation.to, { ...old, depth: Math.min(old.depth, level), out: true });
          next.add(relation.to);
        }
        if ((this.direction === "both" || this.direction === "in") && frontier.has(relation.to)) {
          const old = distances.get(relation.from) ?? { depth: level, in: false, out: false };
          distances.set(relation.from, { ...old, depth: Math.min(old.depth, level), in: true });
          next.add(relation.from);
        }
      }
      frontier = next;
    }
    return distances;
  }

  applySelection() {
    const distances = this.relationNeighborhood();
    const itemMap = new Map(this.model.items.map((item) => [item.id, item]));
    const selection = this.shadowRoot.querySelector(".selection");

    this.shadowRoot.querySelectorAll(".node").forEach((node) => {
      node.className = "node";
      if (!this.selectedId) return;
      if (node.dataset.id === this.selectedId) {
        node.classList.add("selected");
        return;
      }
      const relation = distances.get(node.dataset.id);
      if (!relation) {
        node.classList.add("unrelated");
        return;
      }
      if (relation.in && relation.out) node.classList.add("mixed");
      else if (relation.in) node.classList.add("predecessor");
      else node.classList.add("successor");
      node.classList.add(`depth-${relation.depth}`);
    });

    if (!this.selectedId) {
      selection.classList.remove("visible");
      selection.innerHTML = "";
    } else {
      const item = itemMap.get(this.selectedId);
      const relatedCount = Math.max(0, distances.size - 1);
      selection.classList.add("visible");
      selection.innerHTML = `<strong>${escapeHtml(item?.title ?? this.selectedId)}</strong><small>${escapeHtml(yearLabel(item ?? {}))} · ${relatedCount} yhteyttä valitulla suunnalla ja syvyydellä</small>`;
    }

    this.drawLinks(distances);
  }

  drawLinks(distances = this.relationNeighborhood()) {
    if (!this.model) return;
    const matrix = this.shadowRoot.querySelector(".matrix");
    const svg = matrix?.querySelector(".links");
    if (!matrix || !svg) return;

    const rect = matrix.getBoundingClientRect();
    const width = matrix.scrollWidth;
    const height = matrix.scrollHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const nodeById = new Map([...matrix.querySelectorAll(".node")].map((node) => [node.dataset.id, node]));
    const activeIds = new Set(distances.keys());

    svg.innerHTML = this.model.relations.map((relation) => {
      const from = nodeById.get(relation.from);
      const to = nodeById.get(relation.to);
      if (!from || !to) return "";
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.left - rect.left + matrix.scrollLeft + a.width / 2;
      const y1 = a.top - rect.top + matrix.scrollTop + a.height / 2;
      const x2 = b.left - rect.left + matrix.scrollLeft + b.width / 2;
      const y2 = b.top - rect.top + matrix.scrollTop + b.height / 2;
      const active = this.selectedId && activeIds.has(relation.from) && activeIds.has(relation.to);
      return `<line class="link ${active ? "active" : ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${escapeHtml(relation.type || relation.rel_class || "yhteys")}</title></line>`;
    }).join("");
  }

  showTooltip(event, item) {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.innerHTML = `<small>${escapeHtml(yearLabel(item))}</small><br><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml((item.domains ?? []).join(" · "))}</span>`;
    tooltip.classList.add("visible");
    this.moveTooltip(event);
  }

  moveTooltip(event) {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
  }

  hideTooltip() {
    this.shadowRoot.querySelector(".tooltip")?.classList.remove("visible");
  }
}

if (!customElements.get("atlas-matrix")) {
  customElements.define("atlas-matrix", AtlasMatrix);
}
