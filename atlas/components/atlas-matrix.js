import {
  fetchJson,
  resolveUrl,
  escapeHtml,
  commonStyles,
  renderState,
} from "./atlas-data.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function yearLabel(item) {
  const start = item.year_start ?? "";
  const end = item.year_end;
  return end && end !== start ? `${start}–${end}` : `${start}`;
}

function primaryDomain(item, domains) {
  const list = Array.isArray(item.domains) ? item.domains : [];
  return list.find((d) => domains.includes(d)) ?? "muu";
}

function relationEnds(relation) {
  const source = relation.source ?? relation.from ?? relation.source_id ?? relation.from_id ?? relation.parent ?? relation.predecessor;
  const target = relation.target ?? relation.to ?? relation.target_id ?? relation.to_id ?? relation.child ?? relation.successor;
  return source != null && target != null ? [String(source), String(target)] : null;
}

function relationType(relation) {
  return String(relation.rel_class ?? relation.type ?? relation.relation_type ?? "").toLowerCase();
}

class AtlasMatrix extends HTMLElement {
  static observedAttributes = [
    "data-base", "atlas-url", "from", "to", "domains", "depth", "limit-domains",
  ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = null;
    this.selectedId = null;
    this.direction = "both";
    this.depth = clamp(Number(this.getAttribute("depth") || 2), 1, 3);
    this.period = null;
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
      const allItems = (atlas.items ?? []).filter((item) => num(item.year_start) !== null);
      const relations = Array.isArray(atlas.relations) ? atlas.relations : [];
      if (!allItems.length) throw new Error("Murrosatlaksessa ei ole matriisiin sijoitettavia kohteita.");

      const minDataYear = Math.min(...allItems.map((i) => num(i.year_start)));
      const maxDataYear = Math.max(...allItems.map((i) => num(i.year_start)));
      const from = num(this.getAttribute("from")) ?? minDataYear;
      const to = num(this.getAttribute("to")) ?? maxDataYear;
      const requestedDomains = (this.getAttribute("domains") || "").split(",").map((v) => v.trim()).filter(Boolean);
      const limitDomains = clamp(Number(this.getAttribute("limit-domains") || 12), 3, 24);
      const items = allItems.filter((item) => num(item.year_start) >= from && num(item.year_start) <= to);

      const counts = new Map();
      items.forEach((item) => (item.domains ?? ["muu"]).forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1)));
      const domains = requestedDomains.length
        ? requestedDomains
        : [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "fi")).slice(0, limitDomains).map(([d]) => d);
      if (!domains.includes("muu")) domains.push("muu");

      this.depth = clamp(Number(this.getAttribute("depth") || 2), 1, 3);
      this.model = { items, allItems, relations, domains, from, to, minDataYear, maxDataYear };
      this.renderShell();
      this.renderMatrix();
    } catch (error) {
      console.error("atlas-matrix:", error);
      renderState(this.shadowRoot, "error", error.message || "Rakennematriisia ei voitu ladata.");
    }
  }

  styles() {
    return `
      ${commonStyles()}
      :host { --matrix-cell:clamp(14px,1.45vw,23px); --matrix-node-h:12px; display:block; }
      * { box-sizing:border-box; } button { font:inherit;color:inherit; }
      .wrap { padding:clamp(18px,3vw,34px); }
      .head { display:flex;justify-content:space-between;align-items:flex-end;gap:24px; }
      h2 { margin:0;color:#1f4642;font-size:clamp(1.55rem,3vw,2.45rem);line-height:1.04; }
      .intro { max-width:790px;margin:8px 0 0;color:#6c766f;font-size:13px;line-height:1.55; }
      .stats { display:flex;gap:18px;flex-shrink:0; }
      .stat { text-align:right;color:#6c766f;font-size:9px;text-transform:uppercase;letter-spacing:.1em; }
      .stat strong { display:block;color:#1f4642;font:600 1.55rem var(--atlas-serif,Georgia,serif);line-height:1; }
      .decades { margin:22px 0 16px;padding:14px 14px 10px;border:1px solid #e2dcce;border-radius:12px;background:rgba(247,244,236,.72); }
      .decades-head { display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px; }
      .decades-head strong { color:#1f4642;font:600 1rem var(--atlas-serif,Georgia,serif); }
      .decades-head span { color:#6c766f;font-size:9px;text-transform:uppercase;letter-spacing:.12em; }
      .bars { display:flex;align-items:flex-end;gap:2px;height:72px; }
      .bar-button { position:relative;display:flex;flex:1;flex-direction:column;justify-content:flex-end;height:100%;min-width:4px; }
      .bar { width:100%;min-height:2px;border-radius:3px 3px 0 0;background:#3a6b64;transition:.18s ease; }
      .bar-button:hover .bar,.bar-button.active .bar { background:#b56a34;transform:translateY(-2px); }
      .bar-count { position:absolute;top:-14px;left:50%;transform:translateX(-50%);font:500 8px var(--atlas-mono,monospace);color:#1f4642;opacity:0; }
      .bar-button:hover .bar-count,.bar-button.active .bar-count { opacity:1; }
      .axis { display:flex;justify-content:space-between;margin-top:5px;color:#6c766f;font:500 9px var(--atlas-mono,monospace); }
      .periods { display:flex;flex-wrap:wrap;gap:7px;margin-top:12px; }
      .periods button { padding:5px 10px;border:1px solid #e2dcce;border-radius:999px;background:#fdfcf7;color:#53605a;font:500 10px var(--atlas-mono,monospace); }
      .periods button.active { border-color:#b56a34;background:#b56a34;color:#fffdf7; }
      .tools { display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px; }
      .group { display:flex;align-items:center;gap:3px;padding:3px;border:1px solid #ded8ca;border-radius:999px;background:#fdfcf7; }
      .group > span { padding-left:7px;color:#6c766f;font-size:9px;text-transform:uppercase;letter-spacing:.11em; }
      .chip,.reset { border:0;padding:6px 9px;border-radius:999px;background:transparent;color:#65716b;cursor:pointer;font-size:10px; }
      .chip.active { background:#1f4642;color:#fffdf7; }
      .reset { margin-left:auto;border:1px solid #ded8ca; }
      .selection { display:none;align-items:center;justify-content:space-between;gap:18px;margin:0 0 12px;padding:10px 12px;border-left:3px solid #b56a34;background:#f7f4ec;border-radius:0 9px 9px 0; }
      .selection.visible { display:flex; }
      .selection strong { font:600 1.05rem var(--atlas-serif,Georgia,serif); }
      .selection small { display:block;margin-top:2px;color:#6c766f; }
      .open { flex-shrink:0;padding:6px 10px;border:1px solid #3a6b64;border-radius:999px;color:#1f4642;font-size:11px;font-weight:600; }
      .open:hover { background:#1f4642;color:#fffdf7; }
      .scroller { overflow:auto;border:1px solid #ded8ca;border-radius:13px;background:#fdfcf7;scrollbar-width:thin;max-height:min(62vh,720px); }
      .matrix { position:relative;display:grid;min-width:780px; }
      .corner,.year,.label { position:sticky;z-index:4;background:#f7f4ec; }
      .corner { left:0;top:0;border-right:1px solid #ded8ca;border-bottom:1px solid #ded8ca; }
      .year { top:0;min-width:var(--matrix-cell);padding:7px 1px;border-bottom:1px solid #ded8ca;color:#6c766f;font:500 8px var(--atlas-mono,monospace);text-align:center; }
      .label { left:0;display:flex;align-items:flex-start;min-width:140px;padding:8px 9px;border-right:1px solid #ded8ca;border-bottom:1px solid rgba(222,216,202,.7);color:#1f4642;font-size:10px;font-weight:650;line-height:1.2; }
      .cell { position:relative;min-width:var(--matrix-cell);min-height:100%;border-right:1px solid rgba(226,220,206,.34);border-bottom:1px solid rgba(226,220,206,.34); }
      .cell:nth-child(5n) { background:rgba(58,107,100,.025); }
      .node { position:absolute;left:2px;right:2px;top:var(--node-y,4px);height:var(--matrix-node-h);z-index:3;border:0;border-radius:3px;background:linear-gradient(150deg,#4a9088,#1f4642);outline:1px solid rgba(253,252,247,.78);cursor:pointer;transition:opacity .2s,filter .2s,transform .2s;box-shadow:0 1px 2px rgba(18,51,47,.08); }
      .node:hover { z-index:8;filter:brightness(1.18);transform:scale(1.18); }
      .node.selected { background:linear-gradient(150deg,#f1c36d,#b56a34);outline:2px solid #12332f; }
      .node.predecessor { background:linear-gradient(150deg,#2f6b64,#12332f); }
      .node.successor { background:linear-gradient(150deg,#d69642,#b56a34); }
      .node.mixed { background:linear-gradient(150deg,#967eaa,#79608d); }
      .node.unrelated { opacity:.11; }
      .node.depth-2 { opacity:.72; }
      .node.depth-3 { opacity:.45; }
      .links { position:absolute;inset:0;z-index:2;width:100%;height:100%;pointer-events:none;overflow:visible; }
      .link { fill:none;stroke:rgba(31,70,66,.16);stroke-width:1; }
      .link.active { stroke:rgba(181,106,52,.85);stroke-width:2; }
      .legend { display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;color:#66716b;font-size:10px; }
      .legend span { display:inline-flex;align-items:center;gap:5px; }
      .legend i { width:10px;height:10px;border-radius:2px;background:#2f6f68; }
      .legend .before { background:#12332f; }.legend .after { background:#b56a34; }.legend .mixed { background:#79608d; }
      .tooltip { position:fixed;z-index:9999;display:none;max-width:320px;padding:9px 11px;border-radius:8px;background:#1f4642;color:#fffdf7;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.2);font-size:11px;line-height:1.4; }
      .tooltip.visible { display:block; }.tooltip small { color:#d69642;display:block;margin-bottom:2px; }
      @media(max-width:720px){ .head{display:block}.stats{margin-top:14px}.reset{margin-left:0}.selection{align-items:flex-start;flex-direction:column}.matrix{min-width:700px}.label{min-width:120px}.scroller{max-height:68vh} }
    `;
  }

  renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <section class="surface wrap">
        <div class="head">
          <div>
            <h2><slot name="title">Murrosten rakennematriisi</slot></h2>
            <p class="intro"><slot name="intro">Vaaka-akseli näyttää ajan ja pystyakseli rakenteellisen teeman. Valitse murros nähdäksesi dokumentoidut edeltäjät ja seuraajat.</slot></p>
          </div>
          <div class="stats"><div class="stat"><strong id="visible">–</strong>murrosta</div><div class="stat"><strong id="span">–</strong>vuotta</div></div>
        </div>
        <div class="decades"><div class="decades-head"><strong>Murrosten ajoittuminen</strong><span>valitse vuosikymmen</span></div><div class="bars" id="bars"></div><div class="axis"><span id="axisStart">–</span><span id="axisEnd">–</span></div><div class="periods" id="periods"></div></div>
        <div class="tools">
          <div class="group"><span>Suunta</span><button class="chip active" data-direction="both">Molemmat</button><button class="chip" data-direction="in">Edeltäjät</button><button class="chip" data-direction="out">Seuraajat</button></div>
          <div class="group"><span>Syvyys</span><button class="chip" data-depth="1">1</button><button class="chip active" data-depth="2">2</button><button class="chip" data-depth="3">3</button></div>
          <button class="reset" type="button">Palauta kokonaiskuva</button>
        </div>
        <div class="selection" aria-live="polite"><div><strong class="selection-title"></strong><small class="selection-meta"></small></div><button class="open" type="button">Avaa murros</button></div>
        <div class="scroller"><div class="matrix"><svg class="links" aria-hidden="true"></svg></div></div>
        <div class="legend"><span><i></i> murros</span><span><i class="before"></i> edeltäjä</span><span><i class="after"></i> seuraaja</span><span><i class="mixed"></i> molemmat</span></div>
      </section><div class="tooltip"></div>`;

    this.shadowRoot.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => {
      this.direction = button.dataset.direction;
      this.shadowRoot.querySelectorAll("[data-direction]").forEach((b) => b.classList.toggle("active", b === button));
      this.applySelection();
    }));
    this.shadowRoot.querySelectorAll("[data-depth]").forEach((button) => button.addEventListener("click", () => {
      this.depth = Number(button.dataset.depth);
      this.shadowRoot.querySelectorAll("[data-depth]").forEach((b) => b.classList.toggle("active", b === button));
      this.applySelection();
    }));
    this.shadowRoot.querySelector(".reset").addEventListener("click", () => { this.selectedId = null; this.period = null; this.applySelection(); });
    this.shadowRoot.querySelector(".open").addEventListener("click", () => this.openSelected());
  }

  renderMatrix() {
    const { items, domains, from, to } = this.model;
    const matrix = this.shadowRoot.querySelector(".matrix");
    const binSize = Math.max(5, Math.ceil((to - from + 1) / 60));
    const firstYear = Math.floor(from / binSize) * binSize;
    const years = [];
    for (let year = firstYear; year <= to; year += binSize) years.push(year);

    const domainOrder = domains.filter((d) => d !== "muu");
    const occupancy = new Map();
    const rowLaneCounts = Array(domains.length).fill(1);
    const placements = items.map((item) => {
      const domain = primaryDomain(item, domainOrder);
      const row = Math.max(0, domains.indexOf(domain));
      const col = clamp(Math.round((num(item.year_start) - firstYear) / binSize), 0, years.length - 1);
      const key = `${row}:${col}`;
      const stack = occupancy.get(key) ?? 0;
      occupancy.set(key, stack + 1);
      rowLaneCounts[row] = Math.max(rowLaneCounts[row], stack + 1);
      return { item, row, col, stack };
    });

    const rowHeights = rowLaneCounts.map((lanes) => clamp(12 + lanes * 14, 34, 124));
    matrix.style.gridTemplateColumns = `140px repeat(${years.length}, minmax(var(--matrix-cell), 1fr))`;
    matrix.style.gridTemplateRows = `28px ${rowHeights.map((h) => `${h}px`).join(" ")}`;

    const fragments = ["<div class=\"corner\"></div>"];
    years.forEach((year, i) => {
      const show = i === 0 || i === years.length - 1 || i % Math.max(1, Math.ceil(years.length / 9)) === 0;
      fragments.push(`<div class="year">${show ? year : ""}</div>`);
    });
    domains.forEach((domain, row) => {
      fragments.push(`<div class="label">${escapeHtml(domain)}</div>`);
      years.forEach((year, col) => fragments.push(`<div class="cell" data-row="${row}" data-col="${col}" data-year="${year}"></div>`));
    });
    matrix.innerHTML = `<svg class="links" aria-hidden="true"></svg>${fragments.join("")}`;

    this.positions = new Map();
    placements.forEach(({ item, row, col, stack }) => {
      const cell = matrix.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      if (!cell) return;
      const node = document.createElement("button");
      node.type = "button";
      node.className = "node";
      node.dataset.id = String(item.id);
      node.setAttribute("aria-label", `${item.title ?? item.id}, ${yearLabel(item)}`);
      node.style.setProperty("--node-y", `${4 + Math.min(stack, 7) * 14}px`);
      if (stack > 7) node.style.transform = `translateX(${Math.min(stack - 7, 4)}px)`;
      node.addEventListener("click", () => {
        if (this.selectedId === String(item.id)) this.openSelected();
        else { this.selectedId = String(item.id); this.applySelection(); }
      });
      node.addEventListener("pointerenter", (e) => this.showTooltip(e, item));
      node.addEventListener("pointermove", (e) => this.moveTooltip(e));
      node.addEventListener("pointerleave", () => this.hideTooltip());
      cell.appendChild(node);
      this.positions.set(String(item.id), { row, col, stack, node, item });
    });

    this.shadowRoot.querySelector("#visible").textContent = String(items.length);
    this.shadowRoot.querySelector("#span").textContent = String(Math.max(0, to - from));
    this.renderDecades();
    this.applySelection();
  }

  renderDecades() {
    const { items, from, to } = this.model;
    const start = Math.floor(from / 10) * 10;
    const end = Math.floor(to / 10) * 10;
    const decades = [];
    for (let year = start; year <= end; year += 10) decades.push(year);
    const counts = decades.map((d) => items.filter((i) => num(i.year_start) >= d && num(i.year_start) < d + 10).length);
    const max = Math.max(1, ...counts);
    const bars = this.shadowRoot.querySelector("#bars");
    bars.innerHTML = counts.map((count, i) => `<button class="bar-button ${this.period === decades[i] ? "active" : ""}" data-period="${decades[i]}" title="${decades[i]}–${decades[i]+9}: ${count} murrosta"><span class="bar-count">${count}</span><span class="bar" style="height:${Math.max(3,(count/max)*100)}%"></span></button>`).join("");
    bars.querySelectorAll("[data-period]").forEach((b) => b.addEventListener("click", () => {
      const year = Number(b.dataset.period);
      this.period = this.period === year ? null : year;
      this.applySelection();
    }));
    this.shadowRoot.querySelector("#periods").innerHTML = `<button data-period="all" class="${this.period == null ? "active" : ""}">Koko ajanjakso</button>${decades.filter((_,i)=>counts[i]>0).map((d)=>`<button data-period="${d}" class="${this.period===d?"active":""}">${d}–${d+9}</button>`).join("")}`;
    this.shadowRoot.querySelectorAll("#periods [data-period]").forEach((b) => b.addEventListener("click", () => {
      this.period = b.dataset.period === "all" ? null : Number(b.dataset.period);
      this.applySelection();
    }));
    this.shadowRoot.querySelector("#axisStart").textContent = start;
    this.shadowRoot.querySelector("#axisEnd").textContent = end + 9;
  }

  relationGraph() {
    const byId = new Map(this.model.items.map((i) => [String(i.id), i]));
    const graph = new Map();
    this.model.relations.forEach((relation) => {
      const ends = relationEnds(relation);
      if (!ends) return;
      const [source, target] = ends;
      if (!byId.has(source) || !byId.has(target)) return;
      if (!graph.has(source)) graph.set(source, new Set());
      if (!graph.has(target)) graph.set(target, new Set());
      graph.get(source).add(target);
      graph.get(target).add(source);
    });
    return graph;
  }

  relatedIds(id) {
    const graph = this.relationGraph();
    const distances = new Map([[String(id), 0]]);
    const queue = [String(id)];
    while (queue.length) {
      const current = queue.shift();
      const d = distances.get(current);
      if (d >= this.depth) continue;
      for (const next of graph.get(current) ?? []) {
        if (!distances.has(next)) { distances.set(next, d + 1); queue.push(next); }
      }
    }
    return distances;
  }

  directionalSets(id) {
    const incoming = new Set();
    const outgoing = new Set();
    this.model.relations.forEach((r) => {
      const ends = relationEnds(r); if (!ends) return;
      const [source, target] = ends;
      if (target === id) incoming.add(source);
      if (source === id) outgoing.add(target);
    });
    return { incoming, outgoing };
  }

  applySelection() {
    if (!this.model) return;
    const period = this.period;
    const distances = this.selectedId ? this.relatedIds(this.selectedId) : new Map();
    const { incoming, outgoing } = this.selectedId ? this.directionalSets(this.selectedId) : { incoming:new Set(), outgoing:new Set() };
    this.positions?.forEach(({ node, item }) => {
      node.classList.remove("selected","predecessor","successor","mixed","unrelated","depth-2","depth-3");
      const year = num(item.year_start);
      const inPeriod = period == null || (year >= period && year < period + 10);
      if (!inPeriod) node.classList.add("unrelated");
      if (this.selectedId) {
        const id = String(item.id);
        if (id === this.selectedId) node.classList.add("selected");
        else if (distances.has(id)) {
          if (this.direction === "in" && !incoming.has(id)) node.classList.add("unrelated");
          else if (this.direction === "out" && !outgoing.has(id)) node.classList.add("unrelated");
          else if (incoming.has(id) && outgoing.has(id)) node.classList.add("mixed");
          else if (incoming.has(id)) node.classList.add("predecessor");
          else if (outgoing.has(id)) node.classList.add("successor");
          if (distances.get(id) === 2) node.classList.add("depth-2");
          if (distances.get(id) >= 3) node.classList.add("depth-3");
        } else node.classList.add("unrelated");
      }
    });
    this.renderSelection();
    this.drawLinks();
  }

  renderSelection() {
    const box = this.shadowRoot.querySelector(".selection");
    if (!this.selectedId) { box.classList.remove("visible"); return; }
    const position = this.positions.get(this.selectedId);
    if (!position) { box.classList.remove("visible"); return; }
    const { item } = position;
    box.classList.add("visible");
    box.querySelector(".selection-title").textContent = item.title ?? String(item.id);
    box.querySelector(".selection-meta").textContent = `${yearLabel(item)} · ${(item.domains ?? []).join(" · ")}`;
  }

  drawLinks() {
    if (!this.model || !this.positions) return;
    const matrix = this.shadowRoot.querySelector(".matrix");
    const svg = matrix?.querySelector(".links"); if (!svg) return;
    const rect = matrix.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${Math.max(1,rect.width)} ${Math.max(1,rect.height)}`);
    svg.innerHTML = "";
    const visibleIds = new Set();
    this.positions.forEach(({ node }) => { if (!node.classList.contains("unrelated")) visibleIds.add(node.dataset.id); });
    const selected = this.selectedId;
    this.model.relations.forEach((relation) => {
      const ends = relationEnds(relation); if (!ends) return;
      const [source, target] = ends;
      const a = this.positions.get(source), b = this.positions.get(target); if (!a || !b) return;
      if (!visibleIds.has(source) || !visibleIds.has(target)) return;
      const ar = a.node.getBoundingClientRect(), br = b.node.getBoundingClientRect();
      const x1 = ar.left - rect.left + ar.width/2, y1 = ar.top - rect.top + ar.height/2;
      const x2 = br.left - rect.left + br.width/2, y2 = br.top - rect.top + br.height/2;
      const dx = Math.max(8, Math.abs(x2-x1)*.35);
      const path = document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d", `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`);
      path.setAttribute("class", selected && (source === selected || target === selected) ? "link active" : "link");
      if (relationType(relation).includes("negative")) path.setAttribute("stroke-dasharray","4 3");
      svg.appendChild(path);
    });
  }

  showTooltip(event, item) {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.innerHTML = `<small>${escapeHtml(yearLabel(item))}</small><strong>${escapeHtml(item.title ?? item.id)}</strong>${item.description ? `<div>${escapeHtml(String(item.description).slice(0,220))}</div>` : ""}`;
    tooltip.classList.add("visible");
    this.moveTooltip(event);
  }

  moveTooltip(event) {
    const tooltip = this.shadowRoot.querySelector(".tooltip"); if (!tooltip?.classList.contains("visible")) return;
    const x = Math.min(event.clientX + 14, window.innerWidth - tooltip.offsetWidth - 12);
    const y = Math.min(event.clientY + 14, window.innerHeight - tooltip.offsetHeight - 12);
    tooltip.style.left = `${Math.max(8,x)}px`; tooltip.style.top = `${Math.max(8,y)}px`;
  }

  hideTooltip() { this.shadowRoot.querySelector(".tooltip")?.classList.remove("visible"); }

  openSelected() {
    if (!this.selectedId) return;
    const position = this.positions?.get(this.selectedId); if (!position) return;
    this.dispatchEvent(new CustomEvent("atlas-open-item", { detail: { item: position.item }, bubbles:true, composed:true }));
  }
}

if (!customElements.get("atlas-matrix")) customElements.define("atlas-matrix", AtlasMatrix);

export { AtlasMatrix };
