// renderers/relaatio.js -- kapseloitu mini-relaatioverkko liitteeksi.
// Käyttö: content.view = "relaatio" (esim. chain-liitteille joilla on nodes/links).
// Skeema: nodes[] {id, label, desc?, mechanism|group?}  ·  links[] {from|source, to|target}
// Rajattu laatikko (ei fullscreen), paperiteema, D3-voimakuvaaja. Klikkaus solmua → selite laatikon sisällä.

let cssDone = false;
function injectCss(util) {
  if (cssDone) return; cssDone = true;
  util.injectStyle("appx-css-relaatio", `
    .appx .rel-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 10px 0 6px; font-size: 12px; color: var(--muted, #6b6356); }
    .appx .rel-legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .appx .rel-swatch { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .appx .rel-wrap { position: relative; width: 100%; height: 440px; border: 1px solid var(--line, #e6dfd0); border-radius: 12px; background: var(--card, #fff); overflow: hidden; }
    .appx .rel-svg { width: 100%; height: 100%; display: block; touch-action: none; }
    .appx .rel-node circle { cursor: grab; transition: opacity .15s; }
    .appx .rel-node text { font-family: var(--sans, "Work Sans", sans-serif); pointer-events: none; transition: opacity .15s; }
    .appx .rel-link { transition: stroke-opacity .15s; }
    .appx .rel-dim { opacity: 0.16 !important; }
    .appx .rel-hint { position: absolute; top: 10px; right: 12px; font-size: 10.5px; color: var(--muted-2, #8a8276); pointer-events: none; }
    .appx .rel-detail { position: absolute; left: 12px; bottom: 12px; right: 12px; max-width: 420px; background: var(--bg-soft, #f4efe5); border: 1px solid var(--line, #e6dfd0); border-radius: 10px; padding: 11px 13px; opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; pointer-events: none; }
    .appx .rel-detail.show { opacity: 1; transform: none; }
    .appx .rel-detail .rd-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
    .appx .rel-detail .rd-title { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-size: 18px; line-height: 1.2; color: var(--fg, #1f1b15); margin-bottom: 4px; }
    .appx .rel-detail .rd-desc { font-size: 13px; line-height: 1.55; color: var(--muted, #6b6356); }
    .appx .rel-fallback { list-style: none; padding: 0; margin: 12px 0 0; }
    .appx .rel-fallback li { padding: 7px 0; border-bottom: 1px solid var(--line, #e6dfd0); font-size: 14px; line-height: 1.5; }
  `);
}

const MECH = { rahoitus:"#9a6a3c", rakenne:"#3a6ea5", kapasiteetti:"#4a7a3c", valta:"#a3503a", resilienssi:"#1f6f6b", periaate:"#6c8a4a" };
const FALLBACK = ["#7a5ea8", "#1f6f6b", "#9a6a3c", "#3a6ea5", "#4a7a3c", "#a3503a", "#8a7a2a"];

function buildFallback(nodes, links, esc) {
  const byId = {}; nodes.forEach((n) => byId[n.id] = n.label || n.id);
  return `<ul class="rel-fallback">${nodes.map((n) => {
    const outs = links.filter((l) => l.source === n.id).map((l) => byId[l.target] || l.target);
    return `<li><b>${esc(n.label || n.id)}</b>${outs.length ? ` <span style="color:var(--muted-2,#8a8276)">→ ${outs.map(esc).join(", ")}</span>` : ""}${n.desc ? `<div style="color:var(--muted,#6b6356);font-size:13px">${esc(n.desc)}</div>` : ""}</li>`;
  }).join("")}</ul>`;
}

export async function render(el, c, opts) {
  const { util } = opts;
  injectCss(util);
  const esc = util.esc;

  const rawNodes = Array.isArray(c.nodes) ? c.nodes : [];
  const nodes = rawNodes.map((n, i) => ({
    id: String(n.id != null ? n.id : "n" + i),
    label: n.label || n.name || String(n.id != null ? n.id : i),
    desc: n.desc || n.description || n.kuvaus || "",
    group: n.mechanism || n.group || n.type || n.category || "",
  }));
  const idSet = new Set(nodes.map((n) => n.id));
  const rawLinks = Array.isArray(c.links) ? c.links : (Array.isArray(c.edges) ? c.edges : []);
  const links = rawLinks
    .map((l) => ({ source: String(l.from != null ? l.from : l.source), target: String(l.to != null ? l.to : l.target) }))
    .filter((l) => idSet.has(l.source) && idSet.has(l.target));

  const groups = [...new Set(nodes.map((n) => n.group).filter(Boolean))];
  const colorOf = (gp) => MECH[gp] || (groups.indexOf(gp) >= 0 ? FALLBACK[groups.indexOf(gp) % FALLBACK.length] : "var(--muted, #6b6356)");
  const legend = groups.length
    ? `<div class="rel-legend">${groups.map((gp) => `<span class="rel-legend-item"><span class="rel-swatch" style="background:${colorOf(gp)}"></span>${esc(gp)}</span>`).join("")}</div>`
    : "";

  if (!nodes.length) { el.innerHTML = util.lead(c) + util.note(c) + util.extras(c) + util.source(c); return; }

  el.innerHTML = util.lead(c) + legend +
    `<div class="rel-wrap"><svg class="rel-svg" viewBox="0 0 600 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Relaatioverkko"></svg>
      <div class="rel-hint">Vie osoitin solmun päälle · klikkaa selite</div>
      <div class="rel-detail"></div></div>` +
    util.note(c) + util.extras(c) + util.source(c);

  const wrap = el.querySelector(".rel-wrap");
  const svg = wrap.querySelector(".rel-svg");
  const detail = wrap.querySelector(".rel-detail");

  let d3;
  try { await util.loadLib("d3"); d3 = window.d3; if (!d3) throw new Error("d3"); }
  catch (e) { wrap.outerHTML = buildFallback(nodes, links, esc); return; }

  const W = 600, H = 440, R0 = 13, PAD = 30;
  const deg = {}; nodes.forEach((n) => deg[n.id] = 0);
  links.forEach((l) => { deg[l.source]++; deg[l.target]++; });
  const maxDeg = Math.max(1, ...Object.values(deg));
  const rOf = (n) => R0 + (deg[n.id] / maxDeg) * 6;
  const css = getComputedStyle(document.documentElement);
  const col = (nm, fb) => (css.getPropertyValue(nm).trim() || fb);

  const root = d3.select(svg);
  root.selectAll("*").remove();
  root.append("defs").append("marker").attr("id", "rel-arrow").attr("viewBox", "0 -5 10 10")
    .attr("refX", 9).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
    .append("path").attr("d", "M0,-5L10,0L0,5").style("fill", col("--line-strong", "#c9bfa9"));

  const linkSel = root.append("g").selectAll("line").data(links).join("line")
    .attr("class", "rel-link").attr("stroke", col("--line-strong", "#c9bfa9")).attr("stroke-width", 1.4)
    .attr("stroke-opacity", 0.7).attr("marker-end", "url(#rel-arrow)");

  const nodeSel = root.append("g").selectAll("g").data(nodes).join("g").attr("class", "rel-node");
  nodeSel.append("circle").attr("r", rOf).style("fill", (d) => colorOf(d.group)).attr("stroke", col("--card", "#fff")).attr("stroke-width", 2);
  nodeSel.append("text").attr("x", (d) => rOf(d) + 5).attr("y", 4).attr("font-size", "12").attr("fill", col("--fg-soft", "#3a332a")).text((d) => d.label);

  const adj = {}; nodes.forEach((n) => adj[n.id] = new Set([n.id]));
  links.forEach((l) => { adj[l.source].add(l.target); adj[l.target].add(l.source); });

  let pinned = null;
  function focus(id) {
    nodeSel.classed("rel-dim", (o) => !adj[id].has(o.id));
    linkSel.classed("rel-dim", (o) => !(o.source.id === id || o.target.id === id));
  }
  function clearFocus() { nodeSel.classed("rel-dim", false); linkSel.classed("rel-dim", false); }
  function showDetail(d) {
    detail.innerHTML = `${d.group ? `<div class="rd-tag" style="color:${colorOf(d.group)}">${esc(d.group)}</div>` : ""}<div class="rd-title">${esc(d.label)}</div>${d.desc ? `<div class="rd-desc">${esc(d.desc)}</div>` : ""}`;
    detail.classList.add("show"); detail.style.pointerEvents = "auto";
  }
  function hideDetail() { detail.classList.remove("show"); detail.style.pointerEvents = "none"; }

  nodeSel.on("mouseover", (e, d) => { if (pinned === null) focus(d.id); })
    .on("mouseout", () => { if (pinned === null) clearFocus(); })
    .on("click", (e, d) => { e.stopPropagation(); if (pinned === d.id) { pinned = null; clearFocus(); hideDetail(); } else { pinned = d.id; focus(d.id); showDetail(d); } });
  svg.addEventListener("click", () => { if (pinned !== null) { pinned = null; clearFocus(); hideDetail(); } });

  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(95).strength(0.5))
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide((d) => rOf(d) + 22));

  sim.on("tick", () => {
    nodes.forEach((n) => { n.x = Math.max(PAD, Math.min(W - PAD, n.x)); n.y = Math.max(PAD, Math.min(H - PAD, n.y)); });
    linkSel
      .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
      .attr("x2", (d) => { const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, l = Math.hypot(dx, dy) || 1; return d.target.x - (dx / l) * (rOf(d.target) + 4); })
      .attr("y2", (d) => { const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, l = Math.hypot(dx, dy) || 1; return d.target.y - (dy / l) * (rOf(d.target) + 4); });
    nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  const drag = d3.drag()
    .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
  nodeSel.call(drag);
}