import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const wrap = document.getElementById('canvasWrap');
const loading = document.getElementById('loading');
const yearRange = document.getElementById('yearRange');
const yearOut = document.getElementById('yearOut');
const themeSelect = document.getElementById('themeSelect');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const details = document.getElementById('details');

const categoryLane = { R: -28, S: -14, K: 0, A: 14, M: 28 };
const stageHeight = { structure: 0, trajectory: 8, pressure: 16, event: 24, adaptation: 32 };
const defaultColors = { R: '#4f8ef7', S: '#2fd08c', K: '#f4536a', A: '#8d70c9', M: '#b06a5a' };

let scene;
let camera;
let renderer;
let labelRenderer;
let controls;
let raycaster;
let pointer;
let atlas;
let nodes = [];
let edges = [];
let nodeById = new Map();
let selected = null;
let playing = false;
let playTimer = null;

function yearOf(theme) {
  return Number(theme?.period?.start ?? theme?.year ?? theme?.start_year ?? theme?.epistemic?.known_from ?? 2000);
}

function causalStage(theme) {
  const value = theme?.causal?.stage || theme?.causal?.role || theme?.causal_stage || theme?.cycle_phase;
  if (stageHeight[value] != null) return value;
  if (theme.category === 'K') return 'event';
  if (theme.category === 'S') return 'adaptation';
  return 'structure';
}

function xForYear(year, min, max) {
  return ((year - min) / (max - min) - 0.5) * 150;
}

function categoryColor(id) {
  return atlas.categories?.find(category => category.id === id)?.color || defaultColors[id] || '#b9c4d4';
}

function relationEnds(relation) {
  return [
    relation.from || relation.source || relation.from_id,
    relation.to || relation.target || relation.to_id
  ];
}

async function init() {
  try {
    const response = await fetch('./atlas.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`atlas.json: ${response.status}`);
    atlas = await response.json();
    buildLegend();
    buildSelect();
    setupScene();
    buildLandscape();
    bind();
    animate();
    loading.hidden = true;
  } catch (error) {
    console.error(error);
    loading.innerHTML = `<div class="error"><strong>Maisemaa ei voitu rakentaa.</strong>\n\n${String(error?.stack || error)}</div>`;
  }
}

function buildLegend() {
  const categories = atlas.categories || Object.keys(defaultColors).map(id => ({ id, title: id, color: defaultColors[id] }));
  document.getElementById('legend').innerHTML = categories
    .map(category => `<span><i class="sw" style="background:${category.color}"></i>${category.title || category.id}</span>`)
    .join('');
}

function buildSelect() {
  [...(atlas.themes || [])]
    .sort((a, b) => yearOf(a) - yearOf(b))
    .forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = `${theme.id} · ${theme.name || theme.title}`;
      themeSelect.appendChild(option);
    });
}

function setupScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a0f, 0.0065);

  camera = new THREE.PerspectiveCamera(48, wrap.clientWidth / wrap.clientHeight, 0.1, 1000);
  camera.position.set(15, 70, 125);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(wrap.clientWidth, wrap.clientHeight);
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  wrap.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 35;
  controls.maxDistance = 260;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 10, 0);
  controls.saveState();

  scene.add(new THREE.HemisphereLight(0xb8d2ff, 0x11151d, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-40, 90, 50);
  scene.add(key);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const grid = new THREE.GridHelper(170, 20, 0x42516a, 0x202a39);
  grid.position.y = -2;
  scene.add(grid);
  addAxes();
}

function addAxes() {
  const material = new THREE.LineBasicMaterial({ color: 0x70819a, transparent: true, opacity: 0.55 });
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-78, -1, 34), new THREE.Vector3(78, -1, 34)]),
    material
  ));

  [1850, 1900, 1950, 2000, 2050].forEach(year => {
    const labelNode = document.createElement('div');
    labelNode.textContent = year;
    Object.assign(labelNode.style, {
      color: '#98a8bd', font: '10px ui-monospace,monospace', padding: '2px 4px',
      background: 'rgba(7,10,15,.65)', borderRadius: '4px'
    });
    const label = new CSS2DObject(labelNode);
    label.position.set(xForYear(year, 1850, 2050), -1, 36);
    scene.add(label);
  });
}

function buildLandscape() {
  const themes = atlas.themes || [];
  const years = themes.map(yearOf).filter(Number.isFinite);
  const min = Math.min(1850, ...years);
  const max = Math.max(2050, ...years);

  yearRange.min = min;
  yearRange.max = max;
  yearRange.value = max;
  yearOut.textContent = max;

  const sphere = new THREE.SphereGeometry(1.25, 18, 14);

  themes.forEach((theme, index) => {
    const year = yearOf(theme);
    const category = theme.category || String(theme.id || 'R')[0];
    const stage = causalStage(theme);
    const x = xForYear(year, min, max);
    const y = (stageHeight[stage] ?? 7) + Math.sin(index * 1.71) * 2.2;
    const z = (categoryLane[category] ?? 0) + ((index % 5) - 2) * 0.75;
    const colour = categoryColor(category);

    const material = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.4,
      metalness: 0.08,
      emissive: new THREE.Color(colour).multiplyScalar(0.08),
      transparent: true
    });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(x, y, z);
    mesh.userData = { theme, year };
    scene.add(mesh);
    nodes.push(mesh);
    nodeById.set(theme.id, mesh);
  });

  const baseLineMaterial = new THREE.LineBasicMaterial({ color: 0x71829b, transparent: true, opacity: 0.22 });
  (atlas.relations || []).forEach(relation => {
    const [fromId, toId] = relationEnds(relation);
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) return;

    const midpoint = from.position.clone().lerp(to.position, 0.5);
    midpoint.y += Math.min(12, from.position.distanceTo(to.position) * 0.12);
    const curve = new THREE.QuadraticBezierCurve3(from.position.clone(), midpoint, to.position.clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)),
      baseLineMaterial.clone()
    );
    line.userData = { relation, from, to };
    scene.add(line);
    edges.push(line);
  });

  applyFilters();
}

function bind() {
  addEventListener('resize', resize);
  renderer.domElement.addEventListener('pointermove', event => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  });
  renderer.domElement.addEventListener('click', pick);
  yearRange.addEventListener('input', () => {
    yearOut.textContent = yearRange.value;
    applyFilters();
  });
  themeSelect.addEventListener('change', () => selectById(themeSelect.value));
  playBtn.addEventListener('click', togglePlay);
  resetBtn.addEventListener('click', reset);
  document.getElementById('closeDetails').addEventListener('click', () => selectNode(null));
  addEventListener('message', event => {
    if (event.data?.type === 'murros:theme') document.documentElement.dataset.theme = event.data.theme;
  });
}

function pick() {
  raycaster.setFromCamera(pointer, camera);
  selectNode(raycaster.intersectObjects(nodes, false)[0]?.object || null);
}

function selectById(id) {
  selectNode(id ? nodeById.get(id) : null);
}

function selectNode(mesh) {
  selected = mesh || null;
  themeSelect.value = selected?.userData.theme.id || '';

  if (!selected) {
    details.classList.remove('open');
    applyFilters();
    return;
  }

  const theme = selected.userData.theme;
  document.getElementById('detailId').textContent = `${theme.id} · ${selected.userData.year}`;
  document.getElementById('detailTitle').textContent = theme.name || theme.title || theme.id;
  document.getElementById('detailMeta').innerHTML = [
    theme.category || '–', causalStage(theme), theme.evidence || 'ei näyttöluokkaa'
  ].map(value => `<span class="pill">${value}</span>`).join('');
  document.getElementById('detailSummary').textContent = theme.summary || theme.description || 'Ei kuvausta.';
  details.classList.add('open');
  applyFilters();
  controls.target.copy(selected.position);
  camera.position.lerp(selected.position.clone().add(new THREE.Vector3(18, 22, 34)), 0.35);
}

function connectedIds(id) {
  const result = new Set([id]);
  (atlas.relations || []).forEach(relation => {
    const [from, to] = relationEnds(relation);
    if (from === id) result.add(to);
    if (to === id) result.add(from);
  });
  return result;
}

function applyFilters() {
  const cutoff = Number(yearRange.value);
  const focus = selected ? connectedIds(selected.userData.theme.id) : null;

  nodes.forEach(node => {
    const visible = node.userData.year <= cutoff;
    const active = !focus || focus.has(node.userData.theme.id);
    node.visible = visible;
    node.material.opacity = active ? 1 : 0.1;
    node.scale.setScalar(node === selected ? 2.15 : active ? 1 : 0.72);
  });

  edges.forEach(edge => {
    const { from, to } = edge.userData;
    const visible = from.visible && to.visible;
    const active = !focus || (focus.has(from.userData.theme.id) && focus.has(to.userData.theme.id));
    edge.visible = visible;
    edge.material.opacity = active ? 0.72 : 0.035;
    edge.material.color.set(active ? 0xffd166 : 0x71829b);
  });
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? '❚❚ Pysäytä' : '▶ Toista';
  clearInterval(playTimer);
  if (!playing) return;

  yearRange.value = yearRange.min;
  yearOut.textContent = yearRange.value;
  applyFilters();
  playTimer = setInterval(() => {
    const next = Number(yearRange.value) + 1;
    if (next > Number(yearRange.max)) {
      playing = false;
      playBtn.textContent = '▶ Toista';
      clearInterval(playTimer);
      return;
    }
    yearRange.value = next;
    yearOut.textContent = next;
    applyFilters();
  }, 90);
}

function reset() {
  clearInterval(playTimer);
  playing = false;
  playBtn.textContent = '▶ Toista';
  yearRange.value = yearRange.max;
  yearOut.textContent = yearRange.max;
  selectNode(null);
  controls.reset();
}

function resize() {
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  labelRenderer.setSize(wrap.clientWidth, wrap.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

init();