/*
 * Maisema 3D – kokonaisnäkymän säilyttävä käynnistin.
 * Lisää nykyisen lähiverkkovalinnan rinnalle vaiheittain etenevän
 * Tarinaketjun kopioimatta tai korvaamatta varsinaista 3D-moottoria.
 */

const sourceUrl = new URL('./maisema-app.js', import.meta.url);

async function boot() {
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`maisema-app.js: ${response.status}`);

  let source = await response.text();

  // Klikkaus testaa osuman juuri napsautushetkellä. Näin solmu toimii,
  // vaikka hover-tila ei olisi ehtinyt päivittyä animaatiosilmukassa.
  source = source.replace(
    "dom.addEventListener('click', () => select(hovered || null));",
    `dom.addEventListener('click', event => {
      const bounds = dom.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const candidates = nodes.filter(n => n.opacity > 0.18).map(n => n.mesh);
      const hit = raycaster.intersectObjects(candidates, false)[0];
      select(hit ? nodes.find(n => n.mesh === hit.object) || null : null);
    });`
  );

  // Tarinaketjun tila, ohjaimet, vaiheistus ja nimilaput.
  source = source.replace(
    'function select(node) {',
    `let routeLabels = [];
let selectionMode = 'network';
let storyTimer = null;
let storyPlan = null;
let storyVisibleNodes = new Set();
let storyVisibleEdges = new Set();

function installSelectionModeControl() {
  const row = document.querySelector('.controls .row');
  const reset = document.getElementById('resetBtn');
  if (!row || !reset || document.getElementById('selectionMode')) return;

  const group = document.createElement('div');
  group.id = 'selectionMode';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Valinnan esitystapa');
  Object.assign(group.style, {
    display: 'inline-flex', gap: '2px', padding: '3px', borderRadius: '11px',
    border: '1px solid rgba(126,150,186,.20)', background: 'rgba(255,255,255,.035)'
  });

  group.innerHTML = [
    ['network', 'Lähiverkko'],
    ['story', 'Tarinaketju']
  ].map(([mode, label]) =>
    \`<button type="button" data-mode="\${mode}" aria-pressed="\${mode === selectionMode}" style="border:0;border-radius:8px;padding:6px 9px;background:transparent;color:#93a1b8;cursor:pointer;font:500 10px IBM Plex Mono,monospace;letter-spacing:.03em">\${label}</button>\`
  ).join('');

  reset.insertAdjacentElement('afterend', group);

  const paint = () => group.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === selectionMode;
    button.setAttribute('aria-pressed', String(active));
    button.style.background = active ? 'rgba(255,209,102,.16)' : 'transparent';
    button.style.color = active ? '#ffe0a3' : '#93a1b8';
    button.style.boxShadow = active ? 'inset 0 0 0 1px rgba(255,209,102,.32)' : 'none';
  });

  group.addEventListener('click', event => {
    const button = event.target.closest('[data-mode]');
    if (!button || button.dataset.mode === selectionMode) return;
    selectionMode = button.dataset.mode;
    paint();
    if (selected) {
      renderDetails(selected);
      beginSelectionPresentation(selected);
    }
  });
  paint();
}

function clearRouteLabels() {
  routeLabels.forEach(({ node, label }) => {
    node.group.remove(label);
    label.element?.remove();
  });
  routeLabels = [];
}

function makeRouteLabel(node, primary = false, step = null) {
  if (routeLabels.some(item => item.node === node)) return;
  const el = document.createElement('div');
  el.className = 'route-node-label';
  const stepText = Number.isInteger(step) ? \`<em>VAIHE \${step + 1}</em>\` : '';
  el.innerHTML = \`\${stepText}<b>\${node.theme.id} · \${spanLabel(node.theme)}</b><span>\${node.theme.name || node.theme.title || node.theme.id}</span>\`;
  Object.assign(el.style, {
    maxWidth: primary ? '210px' : '175px',
    padding: primary ? '7px 10px' : '5px 8px',
    borderRadius: '9px',
    border: primary ? '1px solid rgba(255,209,102,.72)' : '1px solid rgba(151,174,207,.38)',
    background: primary ? 'rgba(17,20,25,.94)' : 'rgba(7,11,18,.88)',
    color: '#edf3fc',
    boxShadow: primary ? '0 0 24px rgba(255,209,102,.22)' : '0 8px 24px rgba(0,0,0,.34)',
    fontFamily: 'Inter,system-ui,sans-serif',
    fontSize: primary ? '11px' : '10px',
    lineHeight: '1.25', whiteSpace: 'normal', textAlign: 'left',
    pointerEvents: 'none', opacity: primary ? '1' : '.94',
    transition: 'opacity .28s ease, transform .28s ease'
  });
  const em = el.querySelector('em');
  const b = el.querySelector('b');
  const span = el.querySelector('span');
  if (em) Object.assign(em.style, {
    display: 'block', color: '#93a1b8', font: '600 8px IBM Plex Mono,monospace',
    fontStyle: 'normal', letterSpacing: '.12em', marginBottom: '2px'
  });
  Object.assign(b.style, {
    display: 'block', color: primary ? '#ffd166' : node.color.getStyle(),
    font: '600 9px IBM Plex Mono,monospace', letterSpacing: '.06em', marginBottom: '2px'
  });
  Object.assign(span.style, { display: 'block' });

  const label = new CSS2DObject(el);
  label.position.set(0, node.weight * (primary ? 3.6 : 3.1), 0);
  node.group.add(label);
  routeLabels.push({ node, label });
}

function buildStoryPlan(startNode, maxDepth = 4, maxNodes = 22) {
  const levels = [[startNode]];
  const edgeLevels = [[]];
  const visited = new Set([startNode.theme.id]);
  let frontier = [startNode];

  for (let depth = 1; depth < maxDepth && frontier.length && visited.size < maxNodes; depth++) {
    const next = [];
    const nextEdges = [];

    frontier.forEach(current => {
      edges
        .filter(edge => edge.from === current && edge.to.year >= current.year)
        .sort((a, b) => a.to.year - b.to.year)
        .forEach(edge => {
          const id = edge.to.theme.id;
          if (visited.has(id) || visited.size >= maxNodes) return;
          visited.add(id);
          next.push(edge.to);
          nextEdges.push(edge);
        });
    });

    if (!next.length) break;
    levels.push(next);
    edgeLevels.push(nextEdges);
    frontier = next;
  }

  return { levels, edgeLevels, allNodes: visited };
}

function stopStory() {
  clearTimeout(storyTimer);
  storyTimer = null;
  storyPlan = null;
  storyVisibleNodes = new Set();
  storyVisibleEdges = new Set();
}

function revealStoryLevel(level) {
  if (!storyPlan || level >= storyPlan.levels.length) return;

  storyPlan.levels[level].forEach(node => {
    storyVisibleNodes.add(node.theme.id);
    makeRouteLabel(node, level === 0, level);
  });
  (storyPlan.edgeLevels[level] || []).forEach(edge => {
    storyVisibleEdges.add(edge.rel?.id || edge);
    edge.t = 0;
  });

  applyFilters();

  if (level + 1 < storyPlan.levels.length) {
    storyTimer = setTimeout(() => revealStoryLevel(level + 1), 820);
  }
}

function showNetworkLabels(node) {
  clearRouteLabels();
  const connected = neighbours(node.theme.id);
  nodes
    .filter(n => connected.has(n.theme.id) && n.target > 0)
    .sort((a, b) => a === node ? -1 : b === node ? 1 : a.year - b.year)
    .slice(0, 18)
    .forEach(n => makeRouteLabel(n, n === node));
}

function beginSelectionPresentation(node) {
  clearTimeout(storyTimer);
  clearRouteLabels();
  storyVisibleNodes = new Set();
  storyVisibleEdges = new Set();

  if (selectionMode === 'story') {
    storyPlan = buildStoryPlan(node);
    revealStoryLevel(0);
  } else {
    storyPlan = null;
    applyFilters();
    showNetworkLabels(node);
  }
  flight = null;
}

function activeFocusIds() {
  if (!selected) return null;
  if (selectionMode === 'story') return storyVisibleNodes.size ? storyVisibleNodes : new Set([selected.theme.id]);
  return neighbours(selected.theme.id);
}

function edgeIsHot(edge, focus) {
  if (!focus) return false;
  if (selectionMode === 'story') return storyVisibleEdges.has(edge.rel?.id || edge);
  return focus.has(edge.from.theme.id) && focus.has(edge.to.theme.id);
}

installSelectionModeControl();

function select(node) {`
  );

  // Valinta säilyttää kameran ja käynnistää aktiivisen esitystavan.
  source = source.replace(
    `  if (!selected) {
    details.classList.remove('open');
    controls.autoRotate = false;
    applyFilters();
    return;
  }
  renderDetails(selected);
  applyFilters();
  flyTo(selected.group.position);`,
    `  if (!selected) {
    details.classList.remove('open');
    controls.autoRotate = false;
    stopStory();
    clearRouteLabels();
    applyFilters();
    return;
  }
  renderDetails(selected);
  beginSelectionPresentation(selected);`
  );

  // Valintafokus määräytyy Lähiverkko/Tarinaketju-tilan mukaan.
  source = source.replace(
    'const focus = selected ? neighbours(selected.theme.id) : null;',
    'const focus = selected ? activeFocusIds() : null;'
  );
  source = source.replace(
    'const hot = focus && focus.has(e.from.theme.id) && focus.has(e.to.theme.id);',
    'const hot = edgeIsHot(e, focus);'
  );

  // Taustaa ei sammuteta: koko maisema jää hahmotettavaksi.
  source = source
    .replace('n.target = !inTime || !catOk ? 0 : inFocus ? 1 : 0.12;',
             'n.target = !inTime || !catOk ? 0 : inFocus ? 1 : 0.34;')
    .replace('n.scaleTarget = n === selected ? 1.9 : inFocus ? 1 : 0.62;',
             'n.scaleTarget = n === selected ? 1.7 : inFocus ? 1 : 0.82;')
    .replace('e.target = !on ? 0 : hot ? 0.95 : focus ? 0.04 : 0.22;',
             'e.target = !on ? 0 : hot ? 0.95 : focus ? 0.09 : 0.22;');

  // Uusi tarina-aalto alkaa jokaisella paljastuvalla relaatiolla alusta.
  source = source.replace(
    'e.hot = !!hot;',
    `if (hot && !e.hot) e.t = 0;
    e.hot = !!hot;`
  );

  // Reset palauttaa myös tarinaketjun alkutilaan.
  source = source.replace(
    'function reset() {\n  stopPlay();',
    'function reset() {\n  stopPlay();\n  stopStory();'
  );

  const blob = new Blob([source], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await import(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

boot().catch(error => {
  console.error(error);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `<div class="error"><strong>Maisemaa ei voitu käynnistää.</strong>\n\n${String(error?.stack || error)}</div>`;
  }
});
