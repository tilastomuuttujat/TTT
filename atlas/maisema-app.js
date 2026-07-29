import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ *
 * Maisema 3D -- Suomen rakennemuutosten atlas
 * Data: ./atlas.json  ·  Renderer: three.js (WebGL + CSS2D + bloom)
 * ------------------------------------------------------------------ */

const $ = id => document.getElementById(id);
const wrap = $('canvasWrap');
const loading = $('loading');
const yearRange = $('yearRange');
const yearOut = $('yearOut');
const playBtn = $('playBtn');
const resetBtn = $('resetBtn');
const details = $('details');
const tip = $('tip');
const hint = $('hint');
const searchInput = $('searchInput');
const results = $('results');

const LANE = { R: -30, S: -15, K: 0, A: 15, M: 30 };
const STAGE = { structure: 0, trajectory: 9, pressure: 18, event: 27, adaptation: 36 };
const PHASE = { r: 'structure', alpha: 'trajectory', K: 'pressure', omega: 'event' };
const FALLBACK = { R: '#4f8ef7', S: '#2fd08c', K: '#f4536a', A: '#8d70c9', M: '#c07a5a' };
const SPAN = 168;

let scene, camera, renderer, labels, controls, composer, raycaster;
const pointer = new THREE.Vector2(-2, -2);
const clock = new THREE.Clock();

let atlas = null;
let nodes = [];
let edges = [];
const nodeById = new Map();
let selected = null;
let hovered = null;
let hiddenCats = new Set();
let minYear = 1850, maxYear = 2050;
let playing = false;
let flight = null;

/* ---------------------------------- data helpers */
const yearOf = t => Number(t?.period?.start ?? t?.year ?? t?.start_year ?? t?.epistemic?.known_from ?? 1900);
const endOf = t => Number(t?.period?.end ?? yearOf(t));

function stageOf(t) {
  const raw = t?.causal?.stage || t?.causal?.role || t?.causal_stage;
  if (STAGE[raw] != null) return raw;
  const p = PHASE[t?.cycle_phase];
  if (p) return p;
  if (t.category === 'K') return 'event';
  if (t.category === 'S') return 'adaptation';
  if (t.category === 'A' || t.category === 'M') return 'trajectory';
  return 'structure';
}
const catOf = t => t.category || String(t.id || 'R')[0];
const colorOf = id => atlas?.categories?.find(c => c.id === id)?.color || FALLBACK[id] || '#b9c4d4';
const xOf = y => ((y - minYear) / Math.max(1, maxYear - minYear) - 0.5) * SPAN;
const ends = r => [r.from || r.source || r.from_id, r.to || r.target || r.to_id];

function weightOf(t) {
  const lv = t?.system_position?.impact_levels || [];
  const sum = lv.reduce((a, l) => a + (Number(l.weight) || 0), 0);
  return THREE.MathUtils.clamp(0.8 + sum * 0.28, 0.8, 2.3);
}

/* ---------------------------------- boot */
async function init() {
  try {
    const res = await fetch('./atlas.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`atlas.json: ${res.status}`);
    atlas = await res.json();

    buildChrome();
    setupScene();
    buildLandscape();
    bind();
    animate();

    loading.classList.add('gone');
    setTimeout(() => hint.classList.add('gone'), 7000);
  } catch (err) {
    console.error(err);
    loading.innerHTML = `<div class="error"><strong>Maisemaa ei voitu rakentaa.</strong>\n\n${String(err?.stack || err)}</div>`;
  }
}

/* ---------------------------------- HUD chrome */
function buildChrome() {
  const cats = atlas.categories?.length
    ? atlas.categories
    : Object.keys(FALLBACK).map(id => ({ id, title: id, color: FALLBACK[id] }));

  $('legend').innerHTML = cats.map(c =>
    `<button class="chip" data-cat="${c.id}" style="color:${c.color}">
       <i class="sw" style="background:${c.color}"></i>
       <span style="color:#c3cfe0">${c.title || c.id}</span>
     </button>`).join('');

  $('stats').innerHTML = [
    ['Teemaa', (atlas.themes || []).length],
    ['Ketjua', (atlas.relations || []).length],
    ['Vuotta', `${minYear}–${maxYear}`]
  ].map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}

function refreshStats() {
  const el = $('stats').children[2];
  if (el) el.querySelector('b').textContent = `${minYear}–${maxYear}`;
}

/* ---------------------------------- scene */
function setupScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070c, 0.0052);

  camera = new THREE.PerspectiveCamera(46, wrap.clientWidth / wrap.clientHeight, 0.1, 2000);
  camera.position.set(24, 86, 148);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  wrap.appendChild(renderer.domElement);

  labels = new CSS2DRenderer();
  labels.setSize(wrap.clientWidth, wrap.clientHeight);
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '4' });
  wrap.appendChild(labels.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 34;
  controls.maxDistance = 300;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotateSpeed = 0.28;
  controls.target.set(0, 14, 0);
  controls.saveState();

  scene.add(new THREE.HemisphereLight(0xa8c8ff, 0x0b0f16, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-60, 110, 60);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd166, 0.85);
  rim.position.set(70, 30, -70);
  scene.add(rim);

  raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 1.2;

  buildAtmosphere();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(wrap.clientWidth, wrap.clientHeight), 0.62, 0.72, 0.14
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

function buildAtmosphere() {
  // starfield
  const count = 1400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 300 + Math.random() * 420;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(THREE.MathUtils.randFloatSpread(1.4));
    pos.set([r * Math.sin(ph) * Math.cos(th), Math.abs(r * Math.cos(ph)) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0x9fb6d8, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false })
  );
  stars.name = 'stars';
  scene.add(stars);

  // ground grid
  const grid = new THREE.GridHelper(280, 40, 0x3d4f6b, 0x1b2534);
  grid.position.y = -4;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(150, 64),
    new THREE.MeshBasicMaterial({ color: 0x0d1826, transparent: true, opacity: 0.55, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -4.2;
  scene.add(glow);
}

/* ---------------------------------- landscape */
function buildLandscape() {
  const themes = (atlas.themes || []).filter(t => t && t.id);
  const years = themes.map(yearOf).filter(Number.isFinite);
  minYear = Math.min(1850, ...years);
  maxYear = Math.max(2050, ...years.map((_, i) => endOf(themes[i])).filter(Number.isFinite));

  yearRange.min = minYear;
  yearRange.max = maxYear;
  yearRange.value = maxYear;
  paintYear(maxYear);
  refreshStats();
  buildAxes();
  buildLanes();

  const core = new THREE.IcosahedronGeometry(1.35, 2);
  const halo = new THREE.SphereGeometry(2.5, 20, 16);

  themes.forEach((theme, i) => {
    const y0 = yearOf(theme);
    const cat = catOf(theme);
    const stage = stageOf(theme);
    const c = new THREE.Color(colorOf(cat));
    const w = weightOf(theme);

    const group = new THREE.Group();
    group.position.set(
      xOf(y0),
      (STAGE[stage] ?? 9) + Math.sin(i * 1.71) * 2.4 + 2,
      (LANE[cat] ?? 0) + ((i % 5) - 2) * 1.15
    );

    const mesh = new THREE.Mesh(core, new THREE.MeshStandardMaterial({
      color: c, roughness: 0.28, metalness: 0.35,
      emissive: c.clone().multiplyScalar(0.45), emissiveIntensity: 1,
      transparent: true, opacity: 1
    }));
    mesh.scale.setScalar(w);
    group.add(mesh);

    const shell = new THREE.Mesh(halo, new THREE.MeshBasicMaterial({
      color: c, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.BackSide
    }));
    shell.scale.setScalar(w);
    group.add(shell);

    // stem down to the lane floor
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -(group.position.y + 3.6), 0)]),
      new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.12 })
    );
    group.add(stem);

    scene.add(group);

    const rec = {
      group, mesh, shell, stem, theme, color: c, weight: w,
      year: y0, target: 1, opacity: 1, phase: Math.random() * Math.PI * 2, label: null
    };
    nodes.push(rec);
    nodeById.set(theme.id, rec);
  });

  buildEdges();
  applyFilters(true);
}

function buildAxes() {
  const decades = [];
  for (let y = Math.ceil(minYear / 25) * 25; y <= maxYear; y += 25) decades.push(y);

  const mat = new THREE.LineBasicMaterial({ color: 0x4a5c78, transparent: true, opacity: 0.3 });
  decades.forEach(y => {
    const x = xOf(y);
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -3.9, -40), new THREE.Vector3(x, -3.9, 40)]),
      mat
    ));
    const el = document.createElement('div');
    el.textContent = y;
    Object.assign(el.style, {
      color: '#8fa0b8', font: '500 10px "IBM Plex Mono",monospace', letterSpacing: '.1em',
      padding: '2px 6px', background: 'rgba(5,7,12,.6)', borderRadius: '5px',
      border: '1px solid rgba(126,150,186,.16)'
    });
    const l = new CSS2DObject(el);
    l.position.set(x, -3.4, 44);
    scene.add(l);
  });

  const ticks = $('ticks');
  ticks.innerHTML = decades.filter(y => y % 50 === 0)
    .map(y => `<i style="left:${((y - minYear) / (maxYear - minYear)) * 100}%">${y}</i>`).join('');
}

function buildLanes() {
  (atlas.categories || []).forEach(c => {
    const z = LANE[c.id];
    if (z == null) return;
    const el = document.createElement('div');
    el.textContent = (c.title || c.id).toUpperCase();
    Object.assign(el.style, {
      color: c.color, opacity: '.55', font: '600 9px "IBM Plex Mono",monospace',
      letterSpacing: '.24em', whiteSpace: 'nowrap'
    });
    const l = new CSS2DObject(el);
    l.position.set(-SPAN / 2 - 8, -2.6, z);
    scene.add(l);
  });
}

function buildEdges() {
  (atlas.relations || []).forEach(rel => {
    const [a, b] = ends(rel);
    const from = nodeById.get(a);
    const to = nodeById.get(b);
    if (!from || !to || from === to) return;

    const p0 = from.group.position.clone();
    const p1 = to.group.position.clone();
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y += Math.min(20, p0.distanceTo(p1) * 0.22) + 3;
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const pts = curve.getPoints(48);

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const colors = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      const c = from.color.clone().lerp(to.color, i / (pts.length - 1));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false
    }));
    scene.add(line);

    // travelling spark
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0 })
    );
    scene.add(spark);

    edges.push({ line, spark, curve, from, to, rel, t: Math.random(), opacity: 0.22, target: 0.22 });
  });
}

/* ---------------------------------- interaction */
function bind() {
  addEventListener('resize', resize);

  const dom = renderer.domElement;
  dom.addEventListener('pointermove', e => {
    const b = dom.getBoundingClientRect();
    pointer.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    pointer.y = -((e.clientY - b.top) / b.height) * 2 + 1;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
  });
  dom.addEventListener('pointerleave', () => { pointer.set(-2, -2); });
  dom.addEventListener('pointerdown', () => { hint.classList.add('gone'); });
  dom.addEventListener('click', () => select(hovered || null));

  yearRange.addEventListener('input', () => {
    paintYear(Number(yearRange.value));
    applyFilters();
  });

  $('legend').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const cat = chip.dataset.cat;
    hiddenCats.has(cat) ? hiddenCats.delete(cat) : hiddenCats.add(cat);
    chip.classList.toggle('off', hiddenCats.has(cat));
    applyFilters();
  });

  playBtn.addEventListener('click', togglePlay);
  resetBtn.addEventListener('click', reset);
  $('closeDetails').addEventListener('click', () => select(null));

  details.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]');
    if (b) select(nodeById.get(b.dataset.goto) || null);
  });

  searchInput.addEventListener('input', renderSearch);
  searchInput.addEventListener('focus', renderSearch);
  searchInput.addEventListener('blur', () => setTimeout(() => results.classList.remove('open'), 150));
  results.addEventListener('mousedown', e => {
    const b = e.target.closest('[data-goto]');
    if (b) { select(nodeById.get(b.dataset.goto) || null); searchInput.value = ''; }
  });

  addEventListener('keydown', e => {
    if (e.key === 'Escape') select(null);
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlay(); }
  });
  addEventListener('message', e => {
    if (e.data?.type === 'murros:theme') document.documentElement.dataset.theme = e.data.theme;
  });
}

function renderSearch() {
  const q = searchInput.value.trim().toLowerCase();
  const list = nodes
    .filter(n => !q || `${n.theme.id} ${n.theme.name || n.theme.title || ''}`.toLowerCase().includes(q))
    .sort((a, b) => a.year - b.year)
    .slice(0, 40);
  results.innerHTML = list.map(n =>
    `<button data-goto="${n.theme.id}"><i>${n.theme.id} · ${n.year}</i>${n.theme.name || n.theme.title || ''}</button>`
  ).join('') || '<button disabled style="color:#6c7b93">Ei osumia</button>';
  results.classList.add('open');
}

function paintYear(y) {
  yearOut.innerHTML = `${y}<small>aikaraja</small>`;
  yearRange.style.setProperty('--p', `${((y - minYear) / (maxYear - minYear)) * 100}%`);
}

function neighbours(id) {
  const set = new Set([id]);
  (atlas.relations || []).forEach(r => {
    const [a, b] = ends(r);
    if (a === id) set.add(b);
    if (b === id) set.add(a);
  });
  return set;
}

function select(node) {
  selected = node || null;
  if (!selected) {
    details.classList.remove('open');
    controls.autoRotate = false;
    applyFilters();
    return;
  }
  renderDetails(selected);
  applyFilters();
  flyTo(selected.group.position);
}

function renderDetails(node) {
  const t = node.theme;
  const span = t.period ? `${t.period.start}–${t.period.end ?? '…'}` : String(node.year);
  $('detailId').textContent = `${t.id} · ${span}`;
  $('detailTitle').textContent = t.name || t.title || t.id;

  const cat = atlas.categories?.find(c => c.id === catOf(t));
  $('detailMeta').innerHTML = [
    [cat?.title || catOf(t), true],
    [stageOf(t), false],
    [t.evidence || 'ei näyttöluokkaa', false],
    t.cycle_phase ? [`vaihe ${t.cycle_phase}`, false] : null,
    Number.isFinite(t.viive_years) ? [`viive ${t.viive_years} v`, false] : null
  ].filter(Boolean).map(([v, hot]) => `<span class="pill${hot ? ' hot' : ''}">${v}</span>`).join('');

  $('detailSummary').textContent = t.summary || t.description || 'Ei kuvausta.';

  const rels = (atlas.relations || []).map(r => {
    const [a, b] = ends(r);
    if (a === t.id && nodeById.get(b)) return { n: nodeById.get(b), kind: r.relation_type, dir: '→' };
    if (b === t.id && nodeById.get(a)) return { n: nodeById.get(a), kind: r.relation_type, dir: '←' };
    return null;
  }).filter(Boolean);

  let html = '';
  if (t.viive_note) html += `<div class="sect"><h3>Viive</h3><div class="summary">${t.viive_note}</div></div>`;
  if (rels.length) {
    html += `<div class="sect"><h3>Ketjut (${rels.length})</h3><div class="links">` +
      rels.map(r => `<button data-goto="${r.n.theme.id}">
          <i class="dot" style="background:${r.n.color.getStyle()}"></i>
          <span>${r.dir} ${r.n.theme.name || r.n.theme.id}</span>
          <span class="rel">${(r.kind || '').replace(/_/g, ' ')}</span>
        </button>`).join('') + '</div></div>';
  }
  $('detailExtra').innerHTML = html;
  details.classList.add('open');
  details.scrollTop = 0;
}

function flyTo(target) {
  const offset = new THREE.Vector3(22, 26, 44);
  flight = {
    t: 0,
    fromCam: camera.position.clone(),
    toCam: target.clone().add(offset),
    fromTarget: controls.target.clone(),
    toTarget: target.clone()
  };
}

/* ---------------------------------- filtering */
function applyFilters(instant = false) {
  const cutoff = Number(yearRange.value);
  const focus = selected ? neighbours(selected.theme.id) : null;

  nodes.forEach(n => {
    const inTime = n.year <= cutoff;
    const catOk = !hiddenCats.has(catOf(n.theme));
    const inFocus = !focus || focus.has(n.theme.id);
    n.target = !inTime || !catOk ? 0 : inFocus ? 1 : 0.12;
    n.scaleTarget = n === selected ? 1.9 : inFocus ? 1 : 0.62;
    if (instant) n.opacity = n.target;
  });

  edges.forEach(e => {
    const on = e.from.target > 0.3 && e.to.target > 0.3;
    const hot = focus && focus.has(e.from.theme.id) && focus.has(e.to.theme.id);
    e.target = !on ? 0 : hot ? 0.95 : focus ? 0.04 : 0.22;
    e.hot = !!hot;
    if (instant) e.opacity = e.target;
  });
}

/* ---------------------------------- playback */
let playTimer = null;
function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? '❚❚ Pysäytä' : '▶ Toista';
  clearInterval(playTimer);
  if (!playing) { controls.autoRotate = false; return; }

  controls.autoRotate = !selected;
  yearRange.value = yearRange.min;
  paintYear(Number(yearRange.min));
  applyFilters();
  playTimer = setInterval(() => {
    const next = Number(yearRange.value) + 1;
    if (next > Number(yearRange.max)) return stopPlay();
    yearRange.value = next;
    paintYear(next);
    applyFilters();
  }, 70);
}
function stopPlay() {
  playing = false;
  controls.autoRotate = false;
  playBtn.textContent = '▶ Toista';
  clearInterval(playTimer);
}
function reset() {
  stopPlay();
  hiddenCats = new Set();
  document.querySelectorAll('.chip.off').forEach(c => c.classList.remove('off'));
  yearRange.value = maxYear;
  paintYear(maxYear);
  select(null);
  controls.reset();
}

/* ---------------------------------- loop */
function hoverTest() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nodes.filter(n => n.opacity > 0.4).map(n => n.mesh), false);
  const rec = hits[0] ? nodes.find(n => n.mesh === hits[0].object) : null;
  if (rec === hovered) return;
  hovered = rec;
  renderer.domElement.style.cursor = rec ? 'pointer' : 'grab';
  if (rec) {
    tip.innerHTML = `<i>${rec.theme.id} · ${rec.year}</i>${rec.theme.name || rec.theme.title || ''}`;
    tip.classList.add('on');
  } else {
    tip.classList.remove('on');
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (flight) {
    flight.t = Math.min(1, flight.t + dt * 1.5);
    const e = 1 - Math.pow(1 - flight.t, 3);
    camera.position.lerpVectors(flight.fromCam, flight.toCam, e);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
    if (flight.t >= 1) flight = null;
  }

  nodes.forEach(n => {
    n.opacity += (n.target - n.opacity) * Math.min(1, dt * 7);
    const vis = n.opacity > 0.01;
    n.group.visible = vis;
    if (!vis) return;
    const pulse = n === selected ? 1 + Math.sin(time * 2.6) * 0.07 : 1;
    const s = (n.scaleTarget ?? 1) * pulse;
    n.mesh.material.opacity = n.opacity;
    n.mesh.material.emissiveIntensity = n === hovered || n === selected ? 2.1 : 0.9;
    n.mesh.scale.setScalar(n.weight * s);
    n.mesh.rotation.y += dt * 0.25;
    n.shell.material.opacity = n.opacity * (n === hovered || n === selected ? 0.3 : 0.09);
    n.shell.scale.setScalar(n.weight * s * (1.05 + Math.sin(time * 1.5 + n.phase) * 0.05));
    n.stem.material.opacity = n.opacity * 0.12;
    n.group.position.y += Math.sin(time * 0.8 + n.phase) * 0.006;
  });

  edges.forEach(e => {
    e.opacity += (e.target - e.opacity) * Math.min(1, dt * 6);
    const vis = e.opacity > 0.01;
    e.line.visible = vis;
    e.line.material.opacity = e.opacity;
    if (e.hot && vis) {
      e.t = (e.t + dt * 0.35) % 1;
      e.spark.visible = true;
      e.spark.position.copy(e.curve.getPoint(e.t));
      e.spark.material.opacity = e.opacity;
    } else {
      e.spark.visible = false;
    }
  });

  const stars = scene.getObjectByName('stars');
  if (stars) stars.rotation.y += dt * 0.008;

  hoverTest();
  controls.update();
  composer.render();
  labels.render(scene, camera);
}

function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  labels.setSize(w, h);
}

init();
