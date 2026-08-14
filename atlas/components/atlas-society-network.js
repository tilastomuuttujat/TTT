const NODES = [
  { id: "tyo", label: "Työ", x: 62, y: 116, message: "Työ kytkee toimeentulon, osaamisen, terveyden ja julkisen talouden." },
  { id: "koulutus", label: "Koulutus", x: 178, y: 68, message: "Koulutus muuttaa osaamista, liikkuvuutta, työtä ja osallisuuden mahdollisuuksia." },
  { id: "asuminen", label: "Asuminen", x: 298, y: 122, message: "Asuminen yhdistää alueet, varallisuuden, palvelut ja arjen turvallisuuden." },
  { id: "luottamus", label: "Luottamus", x: 306, y: 260, message: "Luottamus pitää järjestelmän koossa ja vaikuttaa yhteistyöhön sekä hyväksyttävyyteen." },
  { id: "yhteisot", label: "Yhteisöt", x: 250, y: 354, message: "Yhteisöt tuottavat arjen tukea, osallisuutta ja kykyä sopeutua muutokseen." },
  { id: "luonto", label: "Luonto", x: 144, y: 370, message: "Luonto asettaa talouden ja hyvinvoinnin aineelliset reunaehdot." },
  { id: "talous", label: "Talous", x: 54, y: 304, message: "Talous ylläpitää yhteisiä rakenteita, mutta on samalla niistä riippuvainen." },
  { id: "terveys", label: "Terveys", x: 46, y: 212, message: "Terveys vaikuttaa toimintakykyyn, työhön, palvelutarpeeseen ja luottamukseen." },
];

const LINKS = [
  ["tyo", "koulutus"], ["tyo", "terveys"], ["tyo", "talous"],
  ["koulutus", "asuminen"], ["koulutus", "luottamus"],
  ["asuminen", "luottamus"], ["asuminen", "yhteisot"],
  ["luottamus", "yhteisot"], ["luottamus", "terveys"],
  ["yhteisot", "luonto"], ["luonto", "talous"], ["talous", "terveys"],
];

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

class AtlasSocietyNetwork extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.activeId = "tyo";
    this.index = 0;
    this.timer = null;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    this.onVisibility = () => document.hidden ? this.stop() : this.start();
  }

  connectedCallback() {
    this.render();
    this.bind();
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  disconnectedCallback() {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  render() {
    const linkMarkup = LINKS.map(([from, to], index) => {
      const a = NODES.find(node => node.id === from);
      const b = NODES.find(node => node.id === to);
      const bend = index % 2 ? 16 : -16;
      const mx = (a.x + b.x) / 2 + bend;
      const my = (a.y + b.y) / 2;
      return `<path class="link" data-from="${from}" data-to="${to}" d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}"/>`;
    }).join("");

    const coreLinks = NODES.map(node => {
      const mx = (node.x + 180) / 2;
      const my = (node.y + 224) / 2;
      return `<path class="link core-link" data-from="${node.id}" data-to="core" d="M${node.x} ${node.y} Q${mx} ${my} 180 224"/>`;
    }).join("");

    const nodeMarkup = NODES.map(node => `
      <g class="node" data-node="${node.id}" role="button" tabindex="0" aria-label="${escapeHtml(node.label)}. ${escapeHtml(node.message)}">
        <circle class="node-ring" cx="${node.x}" cy="${node.y}" r="22"/>
        <circle class="node-dot" cx="${node.x}" cy="${node.y}" r="12"/>
        <text x="${node.x}" y="${node.y + 36}" text-anchor="middle">${escapeHtml(node.label.toUpperCase())}</text>
      </g>`).join("");

    const chips = NODES.map(node => `<button type="button" class="chip" data-select="${node.id}" aria-pressed="false">${escapeHtml(node.label)}</button>`).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;width:100%;color:#f5f1e8;font-family:var(--atlas-sans,"Source Sans 3",system-ui,sans-serif)}
        *{box-sizing:border-box}
        .shell{position:relative;overflow:hidden;min-height:620px;border:1px solid rgba(142,187,178,.28);border-radius:18px;background:#102f2c;color:#f5f1e8;isolation:isolate}
        .top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 10px}
        .eyebrow{font-size:.6rem;font-weight:750;letter-spacing:.15em;text-transform:uppercase;color:#c9d9d4}
        .step{font-size:.66rem;font-variant-numeric:tabular-nums;color:#f2a33c}
        .chips{display:flex;gap:7px;overflow-x:auto;padding:2px 16px 12px;scrollbar-width:none;overscroll-behavior-inline:contain}
        .chips::-webkit-scrollbar{display:none}
        .chip{flex:0 0 auto;min-height:34px;padding:7px 11px;border:1px solid rgba(201,217,212,.3);border-radius:999px;background:transparent;color:#dce8e4;font:650 .69rem/1 var(--atlas-sans,"Source Sans 3",system-ui,sans-serif);cursor:pointer}
        .chip[aria-pressed="true"]{border-color:#f2a33c;background:#f2a33c;color:#102f2c}
        .map{position:relative;margin:0 10px;border:1px solid rgba(142,187,178,.18);border-radius:14px;background-color:#123531;background-image:linear-gradient(rgba(150,190,182,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(150,190,182,.055) 1px,transparent 1px);background-size:24px 24px;overflow:hidden}
        svg{display:block;width:100%;height:auto;aspect-ratio:360/420;touch-action:manipulation}
        .orbit{fill:none;stroke:#7fb7ad;stroke-width:.8;stroke-dasharray:5 10;opacity:.22}
        .link{fill:none;stroke:#76a9a1;stroke-width:1.1;stroke-dasharray:5 7;opacity:.25;transition:opacity .25s,stroke .25s,stroke-width .25s}
        .link.active{stroke:#f2a33c;stroke-width:2;opacity:.9;animation:flow 3.6s linear infinite}
        .node{cursor:pointer;outline:none;transition:opacity .25s}
        .node-ring{fill:#123531;stroke:#81bcb1;stroke-width:1.2;transition:fill .25s,stroke .25s,stroke-width .25s}
        .node:nth-of-type(odd) .node-ring{stroke:#d98a43}
        .node-dot{fill:#91c7bd;transition:fill .25s}
        .node text{fill:#e7eee9;font:700 8px/1 var(--atlas-sans,"Source Sans 3",system-ui,sans-serif);letter-spacing:.08em;pointer-events:none}
        .node.muted{opacity:.38}
        .node.active .node-ring{fill:rgba(242,163,60,.14);stroke:#f2a33c;stroke-width:2.5}
        .node.active .node-dot{fill:#f2a33c}
        .node:focus-visible .node-ring{stroke:#fff;stroke-width:3}
        .core-halo{fill:rgba(118,169,161,.11);stroke:#76a9a1;stroke-width:1;stroke-dasharray:4 7}
        .core-disc{fill:#1f6159;stroke:#a8d2ca;stroke-width:1.2}
        .core-label{fill:#fff;font:750 9px/1 var(--atlas-sans,"Source Sans 3",system-ui,sans-serif);letter-spacing:.11em}
        .core-small{fill:#b7d2cc;font:600 6.5px/1 var(--atlas-sans,"Source Sans 3",system-ui,sans-serif);letter-spacing:.09em}
        .sheet{position:relative;margin:-4px 18px 14px;padding:15px 14px 14px 19px;border-radius:0 14px 14px 0;background:#f7f2e8;color:#17312e;box-shadow:0 12px 34px rgba(3,18,17,.26)}
        .sheet::before{content:"";position:absolute;inset:0 auto 0 0;width:2px;border-radius:12px;background:#d8782e}
        .sheet-kicker{display:block;margin-bottom:4px;color:#b85e20;font-size:.58rem;font-weight:750;letter-spacing:.14em;text-transform:uppercase}
        .sheet strong{display:block;font-size:1rem;line-height:1.2;color:#154b46}
        .sheet p{margin:6px 0 0;font-size:.76rem;line-height:1.42;color:#455e59}
        .hint{display:flex;align-items:center;justify-content:center;gap:7px;margin:0;padding:0 12px 14px;color:#a9c2bc;font-size:.62rem;letter-spacing:.04em}
        .hint svg{width:16px;height:16px;aspect-ratio:1}
        @keyframes flow{to{stroke-dashoffset:-72}}
        @media(prefers-reduced-motion:reduce){.link.active{animation:none}}
      </style>
      <section class="shell" aria-label="Yhteiskunta rakenteiden verkostona">
        <div class="top"><span class="eyebrow">Yhteiskunta · rakenteiden verkosto</span><span class="step" aria-live="polite"></span></div>
        <nav class="chips" aria-label="Valitse rakenne">${chips}</nav>
        <div class="map">
          <svg viewBox="0 0 360 420" role="img" aria-labelledby="mobile-network-title mobile-network-desc">
            <title id="mobile-network-title">Yhteiskunta rakenteiden verkostona</title>
            <desc id="mobile-network-desc">Kosketa rakennetta nähdäksesi, miten se liittyy yhteiseen järjestelmään ja muihin rakenteisiin.</desc>
            <ellipse class="orbit" cx="180" cy="224" rx="139" ry="155"/>
            <ellipse class="orbit" cx="180" cy="224" rx="92" ry="175" transform="rotate(38 180 224)"/>
            <g>${linkMarkup}${coreLinks}</g>
            <g class="core" aria-hidden="true">
              <circle class="core-halo" cx="180" cy="224" r="51"/>
              <circle class="core-disc" cx="180" cy="224" r="39"/>
              <text class="core-label" x="180" y="219" text-anchor="middle">YHTEINEN</text>
              <text class="core-label" x="180" y="232" text-anchor="middle">JÄRJESTELMÄ</text>
              <text class="core-small" x="180" y="246" text-anchor="middle">RISKI · ARVO · TURVA</text>
            </g>
            <g>${nodeMarkup}</g>
          </svg>
        </div>
        <aside class="sheet" aria-live="polite">
          <span class="sheet-kicker">Verkostovaikutus</span>
          <strong></strong><p></p>
        </aside>
        <p class="hint">Kosketa solmua tai valitse rakenne yläreunasta</p>
      </section>`;
    this.activate(this.activeId, false);
  }

  bind() {
    this.shadowRoot.querySelectorAll("[data-select],[data-node]").forEach(element => {
      const select = () => {
        const id = element.dataset.select || element.dataset.node;
        this.index = NODES.findIndex(node => node.id === id);
        this.activate(id, true);
      };
      element.addEventListener("click", select);
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
      });
    });
  }

  activate(id, manual = false) {
    const selected = NODES.find(node => node.id === id) || NODES[0];
    this.activeId = selected.id;
    const neighbours = new Set([selected.id]);
    LINKS.forEach(([from, to]) => {
      if (from === selected.id) neighbours.add(to);
      if (to === selected.id) neighbours.add(from);
    });
    this.shadowRoot.querySelectorAll(".link").forEach(link => {
      link.classList.toggle("active", link.dataset.from === selected.id || link.dataset.to === selected.id);
    });
    this.shadowRoot.querySelectorAll(".node").forEach(node => {
      node.classList.toggle("active", node.dataset.node === selected.id);
      node.classList.toggle("muted", !neighbours.has(node.dataset.node));
    });
    this.shadowRoot.querySelectorAll(".chip").forEach(chip => chip.setAttribute("aria-pressed", String(chip.dataset.select === selected.id)));
    this.shadowRoot.querySelector(".sheet strong").textContent = selected.label;
    this.shadowRoot.querySelector(".sheet p").textContent = selected.message;
    this.shadowRoot.querySelector(".sheet-kicker").textContent = manual ? "Valittu rakenne" : "Verkostovaikutus";
    this.shadowRoot.querySelector(".step").textContent = `${NODES.findIndex(node => node.id === selected.id) + 1} / ${NODES.length}`;
    const chip = this.shadowRoot.querySelector(`.chip[data-select="${selected.id}"]`);
    const chipRail = this.shadowRoot.querySelector(".chips");
    if (chip && chipRail) {
      const left = chip.offsetLeft - (chipRail.clientWidth - chip.offsetWidth) / 2;
      chipRail.scrollTo({ left, behavior: this.reducedMotion.matches ? "auto" : "smooth" });
    }
    if (manual) this.restart();
  }

  start() {
    if (this.timer || this.reducedMotion.matches || document.hidden) return;
    this.timer = setInterval(() => {
      this.index = (this.index + 1) % NODES.length;
      this.activate(NODES[this.index].id, false);
    }, 3600);
  }

  stop() { clearInterval(this.timer); this.timer = null; }
  restart() { this.stop(); this.start(); }
}

if (!customElements.get("atlas-society-network")) customElements.define("atlas-society-network", AtlasSocietyNetwork);
