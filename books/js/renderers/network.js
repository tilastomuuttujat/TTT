// renderers/network.js -- D3-voimaohjattu relaatioverkko.
// Käyttö: aseta liitteen content.view = "network" (esim. chain-liitteille joilla on nodes/links).
// Skeema: nodes[] {id, label, desc?, mechanism|group|type?}  ·  links[] {from|source, to|target, label?}
// Asynkroninen: lataa D3:n loaderin loadLib("d3"):llä. Jos lataus epäonnistuu → tekstifallback.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-network", `
    .appx .appx-net-wrap { position: relative; width: 100%; margin: 14px 0 0; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .appx-net-svg { width: 100%; height: auto; display: block; cursor: grab; }
    .appx .appx-net-svg:active { cursor: grabbing; }
    .appx .appx-net-link { stroke: var(--line-strong, #c9bfa9); stroke-width: 1.4; }
    .appx .appx-net-link-label { font-size: 9px; fill: var(--muted-2, #8a8276); }
    .appx .appx-net-node circle { stroke: var(--card, #fff); stroke-width: 2; cursor: grab; transition: opacity .15s; }
    .appx .appx-net-node text { font-size: 11px; fill: var(--fg, #1f1b15); paint-order: stroke; stroke: var(--card, #fff); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; transition: opacity .15s; }
    .appx .appx-net-dim { opacity: .15; }
    .appx .appx-net-legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 14px; border-top: 1px solid var(--line, #e6dfd0); font-size: 12px; color: var(--muted, #6b6356); }
    .appx .appx-net-legend-item { display: inline-flex; align-items: center; gap: 5px; }
    .appx .appx-net-swatch { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .appx .appx-net-hint { font-size: 11px; color: var(--muted-2, #8a8276); padding: 0 14px 8px; }
    .appx .appx-net-fallback { list-style: none; padding: 0; margin: 14px 0 0; }
    .appx .appx-net-fallback li { padding: 8px 0; border-bottom: 1px solid var(--line, #e6dfd0); font-size: 14px; line-height: 1.5; }
    .appx .appx-net-fallback li:last-child { border-bottom: none; }
    .appx .appx-net-fallback b { color: var(--fg, #1f1b15); }
    .appx .appx-net-fallback .edge { color: var(--muted-2, #8a8276); }
  `);
}

const PALETTE = ["#1f6f6b", "#9a6a3c", "#7a5ea8", "#4a7a3c", "#a3503a", "#3a6ea5", "#8a7a2a", "#6b6356"];

function buildFallback(nodes, links, esc) {
  const byId = {};
  for (const n of nodes) byId[n.id] = n.label || n.id;
  const items = nodes.map((n) => {
    const outs = links.filter((l) => l.source === n.id).map((l) => byId[l.target] || l.target);
    const edge = outs.length ? `<span class="edge"> → ${outs.map(esc).join(", ")}</span>` : "";
    return `<li><b>${esc(n.label || n.id)}</b>${edge}${n.desc ? `<div>${esc(n.desc)}</div>` : ""}</li>`;
  }).join("");
  return `<ul class="appx-net-fallback">${items}</ul>`;
}

export async function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  // ── normalisoi data ──
  const rawNodes = Array.isArray(c.nodes) ? c.nodes : [];
  const nodes = rawNodes.map((n, i) => ({
    id: String(n.id != null ? n.id : "n" + i),
    label: n.label || n.name || n.title || String(n.id != null ? n.id : i),
    desc: n.desc || n.description || n.kuvaus || "",
    group: n.group || n.mechanism || n.type || n.category || "",
  }));
  const idSet = new Set(nodes.map((n) => n.id));
  const rawLinks = Array.isArray(c.links) ? c.links : (Array.isArray(c.edges) ? c.edges : []);
  const links = rawLinks
    .map((l) => ({ source: String(l.from != null ? l.from : l.source), target: String(l.to != null ? l.to : l.target), label: l.label || l.mechanism || "" }))
    .filter((l) => idSet.has(l.source) && idSet.has(l.target));

  // ryhmävärit + selite
  const groups = [...new Set(nodes.map((n) => n.group).filter(Boolean))];
  const colorOf = (g) => { const i = groups.indexOf(g); return i < 0 ? "var(--muted, #6b6356)" : PALETTE[i % PALETTE.length]; };
  const legendHtml = groups.length
    ? `<div class="appx-net-legend">${groups.map((g) => `<span class="appx-net-legend-item"><span class="appx-net-swatch" style="background:${colorOf(g)}"></span>${esc(g)}</span>`).join("")}</div>`
    : "";

  if (!nodes.length) { el.innerHTML = util.lead(c) + util.note(c) + util.extras(c) + util.source(c); return; }

  // runko
  el.innerHTML = util.lead(c) + util.note(c)
    + `<div class="appx-net-wrap"><svg class="appx-net-svg" role="img" aria-label="Relaatioverkko"></svg>`
    + `<div class="appx-net-hint">Raahaa solmuja · vie osoitin solmun päälle korostaaksesi yhteydet</div>`
    + legendHtml + `</div>`
    + util.extras(c) + util.source(c);

  const svg = el.querySelector(".appx-net-svg");

  let d3;
  try { await util.loadLib("d3"); d3 = window.d3; if (!d3) throw new Error("d3 puuttuu"); }
  catch (e) {
    const wrap = el.querySelector(".appx-net-wrap");
    if (wrap) wrap.outerHTML = buildFallback(nodes, links, esc);
    return;
  }

  const W = 640, H = Math.max(320, Math.min(520, 150 + nodes.length * 42));
  const R = 11, PAD = 26;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const root = d3.select(svg);
  root.selectAll("*").remove();

  // nuolimarkkeri
  root.append("defs").append("marker")
    .attr("id", "appx-net-arrow").attr("viewBox", "0 -5 10 10")
    .attr("refX", 9).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
    .append("path").attr("d", "M0,-5L10,0L0,5").attr("class", "appx-net-arrowhead")
    .style("fill", "var(--line-strong, #c9bfa9)");

  const linkSel = root.append("g").selectAll("line").data(links).join("line")
    .attr("class", "appx-net-link").attr("marker-end", "url(#appx-net-arrow)");

  const nodeSel = root.append("g").selectAll("g").data(nodes).join("g").attr("class", "appx-net-node");
  nodeSel.append("circle").attr("r", R).style("fill", (d) => colorOf(d.group));
  nodeSel.append("title").text((d) => d.label + (d.desc ? " -- " + d.desc : ""));
  nodeSel.append("text").attr("x", R + 5).attr("y", 4).text((d) => d.label);

  // naapuruus hover-korostusta varten
  const adj = {};
  nodes.forEach((n) => { adj[n.id] = new Set([n.id]); });
  links.forEach((l) => { adj[l.source].add(l.target); adj[l.target].add(l.source); });

  nodeSel.on("mouseover", (event, d) => {
    nodeSel.classed("appx-net-dim", (o) => !adj[d.id].has(o.id));
    linkSel.classed("appx-net-dim", (o) => !(o.source.id === d.id || o.target.id === d.id));
  }).on("mouseout", () => {
    nodeSel.classed("appx-net-dim", false);
    linkSel.classed("appx-net-dim", false);
  });

  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(95).strength(0.6))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide(R + 16));

  sim.on("tick", () => {
    nodes.forEach((n) => { n.x = Math.max(PAD, Math.min(W - PAD, n.x)); n.y = Math.max(PAD, Math.min(H - PAD, n.y)); });
    linkSel
      .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
      .attr("x2", (d) => { const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, l = Math.hypot(dx, dy) || 1; return d.target.x - (dx / l) * (R + 4); })
      .attr("y2", (d) => { const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, l = Math.hypot(dx, dy) || 1; return d.target.y - (dy / l) * (R + 4); });
    nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  const drag = d3.drag()
    .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
  nodeSel.call(drag);
}