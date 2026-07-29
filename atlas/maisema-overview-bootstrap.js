/*
 * Maisema 3D – kokonaisnäkymän säilyttävä käynnistin.
 * Lataa nykyisen maisema-app.js:n ja tekee pienet, rajatut muutokset
 * ilman että uudistettua 3D-moottoria kopioidaan tai korvataan.
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

  // Lisää reittien nimilaput ennen select-funktiota.
  source = source.replace(
    'function select(node) {',
    `let routeLabels = [];

function clearRouteLabels() {
  routeLabels.forEach(({ node, label }) => {
    node.group.remove(label);
    label.element?.remove();
  });
  routeLabels = [];
}

function makeRouteLabel(node, primary = false) {
  const el = document.createElement('div');
  el.className = 'route-node-label';
  el.innerHTML = \`<b>\${node.theme.id} · \${node.year}</b><span>\${node.theme.name || node.theme.title || node.theme.id}</span>\`;
  Object.assign(el.style, {
    maxWidth: primary ? '210px' : '175px',
    padding: primary ? '7px 10px' : '5px 8px',
    borderRadius: '9px',
    border: primary ? '1px solid rgba(255,209,102,.72)' : '1px solid rgba(151,174,207,.38)',
    background: primary ? 'rgba(17,20,25,.94)' : 'rgba(7,11,18,.86)',
    color: '#edf3fc',
    boxShadow: primary ? '0 0 24px rgba(255,209,102,.22)' : '0 8px 24px rgba(0,0,0,.34)',
    fontFamily: 'Inter,system-ui,sans-serif',
    fontSize: primary ? '11px' : '10px',
    lineHeight: '1.25',
    whiteSpace: 'normal',
    textAlign: 'left',
    pointerEvents: 'none',
    opacity: primary ? '1' : '.92'
  });
  const b = el.querySelector('b');
  const span = el.querySelector('span');
  Object.assign(b.style, {
    display: 'block', color: primary ? '#ffd166' : node.color.getStyle(),
    font: '600 9px "IBM Plex Mono",monospace', letterSpacing: '.06em', marginBottom: '2px'
  });
  Object.assign(span.style, { display: 'block' });

  const label = new CSS2DObject(el);
  label.position.set(0, node.weight * (primary ? 3.6 : 3.1), 0);
  node.group.add(label);
  routeLabels.push({ node, label });
}

function showRouteLabels(node) {
  clearRouteLabels();
  if (!node) return;

  const connected = neighbours(node.theme.id);
  const labelled = nodes
    .filter(n => connected.has(n.theme.id) && n.target > 0)
    .sort((a, b) => {
      if (a === node) return -1;
      if (b === node) return 1;
      return a.year - b.year;
    })
    .slice(0, 18);

  labelled.forEach(n => makeRouteLabel(n, n === node));
}

function select(node) {`
  );

  // Valinta säilyttää kameran ja kokonaismaiseman. Napsautus sekä haku
  // käyttävät samaa nimeämis- ja reittikorostusta.
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
    clearRouteLabels();
    applyFilters();
    return;
  }
  renderDetails(selected);
  applyFilters();
  showRouteLabels(selected);
  flight = null;`
  );

  // Taustaa ei sammuteta: koko maisema jää hahmotettavaksi.
  source = source
    .replace('n.target = !inTime || !catOk ? 0 : inFocus ? 1 : 0.12;',
             'n.target = !inTime || !catOk ? 0 : inFocus ? 1 : 0.34;')
    .replace('n.scaleTarget = n === selected ? 1.9 : inFocus ? 1 : 0.62;',
             'n.scaleTarget = n === selected ? 1.7 : inFocus ? 1 : 0.82;')
    .replace('e.target = !on ? 0 : hot ? 0.95 : focus ? 0.04 : 0.22;',
             'e.target = !on ? 0 : hot ? 0.95 : focus ? 0.09 : 0.22;');

  // Valinnan yhteydessä kaikki korostetut valopallot lähtevät samasta
  // selkeästä alkuhetkestä, jolloin ratoja on helpompi seurata.
  source = source.replace(
    'e.hot = !!hot;',
    `if (hot && !e.hot) e.t = 0;
    e.hot = !!hot;`
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
