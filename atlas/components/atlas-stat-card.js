const MODULE_URL = new URL(import.meta.url);
const DEFAULT_BASE_URL = new URL("../", MODULE_URL);

const cache = new Map();

async function fetchJson(url) {
  const key = url.href;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(url, { cache: "no-cache" }).then(async response => {
        if (!response.ok) {
          throw new Error(`${url.pathname}: HTTP ${response.status}`);
        }
        return response.json();
      })
    );
  }
  return cache.get(key);
}

function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatValue(value, decimals, unit) {
  const formatted = new Intl.NumberFormat("fi-FI", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function attrBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return !["false", "0", "no", "off"].includes(String(value).toLowerCase());
}

class AtlasStatCard extends HTMLElement {
  static observedAttributes = ["card", "data-base", "cards-url", "data-url"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.resizeObserver = new ResizeObserver(() => this.renderChart());
    this.model = null;
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

  resolveUrls() {
    const base = this.getAttribute("data-base")
      ? new URL(this.getAttribute("data-base"), document.baseURI)
      : DEFAULT_BASE_URL;

    return {
      cards: this.getAttribute("cards-url")
        ? new URL(this.getAttribute("cards-url"), document.baseURI)
        : new URL("visualization-cards.json", base),
      data: this.getAttribute("data-url")
        ? new URL(this.getAttribute("data-url"), document.baseURI)
        : new URL("tilastomuuttujat.json", base),
    };
  }

  async load() {
    const cardId = this.getAttribute("card");
    if (!cardId) {
      this.renderError("Kortin card-tunnus puuttuu.");
      return;
    }

    this.renderLoading();

    try {
      const urls = this.resolveUrls();
      const [cardDocument, dataDocument] = await Promise.all([
        fetchJson(urls.cards),
        fetchJson(urls.data),
      ]);

      const card = cardDocument.cards?.find(item => item.id === cardId);
      if (!card) throw new Error(`Visualisointikorttia ${cardId} ei löydy.`);

      const seriesMap = new Map(
        (dataDocument.series ?? []).map(series => [series.code, series])
      );

      const series = (card.series ?? []).map(code => {
        const found = seriesMap.get(code);
        if (!found) throw new Error(`Tilastosarjaa ${code} ei löydy.`);
        return found;
      });

      this.model = { card, series };
      this.renderShell();
      this.renderChart();
    } catch (error) {
      console.error("atlas-stat-card:", error);
      this.renderError(error.message || "Visualisoinnin lataus epäonnistui.");
    }
  }

  styles() {
    return `
      :host {
        display: block;
        color: var(--atlas-ink, #172421);
        font-family: var(--atlas-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      }
      * { box-sizing: border-box; }
      .card {
        background: var(--atlas-paper, #fdfcf7);
        border: 1px solid var(--atlas-line, #ded8ca);
        border-radius: var(--atlas-radius, 16px);
        box-shadow: 0 8px 30px rgba(18, 51, 47, .08);
        overflow: hidden;
      }
      .head { padding: 20px 22px 0; }
      h2 {
        margin: 0;
        color: var(--atlas-title, #1f4642);
        font: 600 clamp(1.1rem, 2.2vw, 1.55rem)/1.18 var(--atlas-serif, Georgia, serif);
      }
      .subtitle { margin-top: 5px; color: #66736d; font-size: .88rem; }
      .chart-wrap { min-height: 280px; padding: 8px 14px 0; }
      svg { width: 100%; height: 100%; min-height: 270px; display: block; overflow: visible; }
      .grid { stroke: #e5e0d6; stroke-width: 1; }
      .axis { fill: #6c766f; font-size: 11px; }
      .line { fill: none; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
      .forecast { stroke-dasharray: 7 6; }
      .area { opacity: .12; }
      .point { stroke: var(--atlas-paper, #fdfcf7); stroke-width: 2; }
      .value { font-size: 11px; font-weight: 700; }
      .legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 0 22px 12px; }
      .legend-item { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: #47534e; }
      .swatch { width: 18px; height: 3px; border-radius: 4px; }
      .notes { border-top: 1px solid #e5e0d6; padding: 12px 22px 16px; color: #5e6964; font-size: 12px; }
      .notes p { margin: 5px 0; }
      .source { margin-top: 8px; font-size: 11px; color: #7b8580; }
      .loading, .error { padding: 24px; border: 1px solid #ded8ca; border-radius: 14px; background: #fdfcf7; }
      .error { color: #9b392c; }
      @media (max-width: 520px) {
        .head { padding: 16px 16px 0; }
        .chart-wrap { padding-inline: 6px; min-height: 240px; }
        svg { min-height: 230px; }
        .legend, .notes { padding-inline: 16px; }
      }
    `;
  }

  renderLoading() {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="loading">Ladataan visualisointia…</div>`;
  }

  renderError(message) {
    this.model = null;
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="error"><strong>Visualisointia ei voitu näyttää.</strong><br>${escapeHtml(message)}</div>`;
  }

  renderShell() {
    const { card, series } = this.model;
    const palette = ["#2f6f68", "#b56a34", "#735b9e", "#a6402f", "#59738b"];

    const legend = series.length > 1
      ? `<div class="legend">${series.map((item, index) => `
          <span class="legend-item">
            <span class="swatch" style="background:${palette[index % palette.length]}"></span>
            ${escapeHtml(item.title)}
          </span>`).join("")}</div>`
      : "";

    const showNotes = attrBoolean(card.options?.show_notes, true);
    const notes = showNotes
      ? series.flatMap(item => (item.values ?? [])
          .filter(point => point.note)
          .map(point => `<p><strong>${point.year}:</strong> ${escapeHtml(point.note)}</p>`))
      : [];

    const sources = unique(series.map(item => item.source).filter(Boolean));

    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <article class="card">
        <header class="head">
          <h2>${escapeHtml(card.title)}</h2>
          ${card.subtitle ? `<div class="subtitle">${escapeHtml(card.subtitle)}</div>` : ""}
        </header>
        <div class="chart-wrap"><svg part="chart" role="img" aria-label="${escapeHtml(card.title)}"></svg></div>
        ${legend}
        ${(notes.length || sources.length) ? `<footer class="notes">${notes.join("")}${sources.length ? `<div class="source">Lähde: ${escapeHtml(sources.join("; "))}</div>` : ""}</footer>` : ""}
      </article>`;
  }

  renderChart() {
    if (!this.model) return;
    const svg = this.shadowRoot.querySelector("svg");
    const wrap = this.shadowRoot.querySelector(".chart-wrap");
    if (!svg || !wrap) return;

    const { card, series } = this.model;
    const width = Math.max(320, wrap.clientWidth || 700);
    const height = width < 500 ? 230 : 290;
    const margin = { top: 24, right: 24, bottom: 38, left: 54 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const palette = ["#2f6f68", "#b56a34", "#735b9e", "#a6402f", "#59738b"];

    const allPoints = series.flatMap(item => item.values ?? []);
    if (!allPoints.length) {
      svg.innerHTML = `<text x="20" y="40">Ei havaintoja.</text>`;
      return;
    }

    const years = allPoints.map(point => number(point.year));
    const values = allPoints.map(point => number(point.value));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const zeroBaseline = attrBoolean(card.options?.zero_baseline, false);
    const minValue = zeroBaseline ? Math.min(0, rawMin) : rawMin;
    const valueSpan = Math.max(1, rawMax - minValue);
    const yMin = zeroBaseline ? minValue : minValue - valueSpan * .12;
    const yMax = rawMax + valueSpan * .14;

    const x = year => margin.left + ((year - minYear) / Math.max(1, maxYear - minYear)) * innerWidth;
    const y = value => margin.top + (1 - (value - yMin) / Math.max(.0001, yMax - yMin)) * innerHeight;

    const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
    const yearTicks = unique([minYear, ...years, maxYear]).sort((a, b) => a - b);
    const reducedYearTicks = yearTicks.length <= 7
      ? yearTicks
      : yearTicks.filter((_, index) => index % Math.ceil(yearTicks.length / 6) === 0 || index === yearTicks.length - 1);

    const forecastFrom = number(card.options?.forecast_from, Infinity);
    const showPoints = attrBoolean(card.options?.show_points, true);
    const showValues = attrBoolean(card.options?.show_values, true);

    const grid = yTicks.map(tick => `
      <line class="grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
      <text class="axis" x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end">${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 }).format(tick)}</text>`).join("");

    const xLabels = reducedYearTicks.map(year => `
      <text class="axis" x="${x(year)}" y="${height - 12}" text-anchor="middle">${year}</text>`).join("");

    const seriesMarkup = series.map((item, index) => {
      const color = palette[index % palette.length];
      const points = [...(item.values ?? [])].sort((a, b) => a.year - b.year);
      const before = points.filter(point => point.year <= forecastFrom);
      const after = points.filter(point => point.year >= forecastFrom);
      if (before.length && after.length && before.at(-1)?.year !== after[0]?.year) {
        after.unshift(before.at(-1));
      }

      const pathFor = list => list.map((point, pointIndex) => `${pointIndex ? "L" : "M"}${x(point.year)},${y(point.value)}`).join(" ");
      const areaPath = points.length
        ? `${pathFor(points)} L${x(points.at(-1).year)},${y(yMin)} L${x(points[0].year)},${y(yMin)} Z`
        : "";

      return `
        ${card.type === "area" ? `<path class="area" d="${areaPath}" fill="${color}"></path>` : ""}
        ${before.length > 1 ? `<path class="line" d="${pathFor(before)}" stroke="${color}"></path>` : ""}
        ${after.length > 1 && forecastFrom !== Infinity ? `<path class="line forecast" d="${pathFor(after)}" stroke="${color}"></path>` : ""}
        ${forecastFrom === Infinity && points.length > 1 ? `<path class="line" d="${pathFor(points)}" stroke="${color}"></path>` : ""}
        ${showPoints ? points.map(point => `<circle class="point" cx="${x(point.year)}" cy="${y(point.value)}" r="5" fill="${color}"><title>${escapeHtml(`${item.title}: ${point.year}, ${formatValue(point.value, item.decimals ?? 1, item.unit)}`)}</title></circle>`).join("") : ""}
        ${showValues ? points.map(point => `<text class="value" x="${x(point.year)}" y="${y(point.value) - 10}" text-anchor="middle" fill="${color}">${escapeHtml(formatValue(point.value, item.decimals ?? 1, item.unit))}</text>`).join("") : ""}`;
    }).join("");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `${grid}${xLabels}${seriesMarkup}`;
  }
}

if (!customElements.get("atlas-stat-card")) {
  customElements.define("atlas-stat-card", AtlasStatCard);
}
