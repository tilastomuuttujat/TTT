import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const root = document.getElementById('viewRoot');
const loader = document.getElementById('loader');
const tabs = [...document.querySelectorAll('.tab')];
const themeBtn = document.getElementById('themeBtn');
const fsBtn = document.getElementById('fsBtn');

document.body.appendChild(loader);

const THEME_KEY = 'murros-theme';
const SUPABASE_URL = 'https://zzbubbrsgiqsvsovkkmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YNqxZI4Oj-DSjVBoTKhQ2Q_4DchUIBb';
const STORAGE_BUCKET = 'atlas-images';
const ATLAS_DATA_FILES = [
  'suomen_murrosvaiheet_syvennetty.json',
  'murrosatlas.json',
  'selitysatlas.json'
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const VIEWS = {
  rengas: () => import('../views/rengas.js'),
  verkko: () => import('../views/verkko.js'),
  matriisi: () => import('../views/matriisi.js'),
  paattely: () => import('../views/paattely.js'),
  maisema: () => import('../views/maisema.js'),
  atlasverkko: () => import('../views/atlasverkko.js')
};

let activeView = null;
let activeModule = null;
let switching = false;
let activeSession = null;
let infographicRows = [];
let infographicsByTarget = new Map();
let infographicById = new Map();
let infographicByUrl = new Map();
let adminObserver = null;

function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {
    return 'light';
  }
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }
  activeModule?.setTheme?.(theme);
}

function selectedView() {
  const key = location.hash.replace(/^#\/?/, '');
  return VIEWS[key] ? key : 'rengas';
}

function setActiveTab(name) {
  tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.view === name)));
}

function storageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = String(path).replace(/^\/+/, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${normalized}`;
}

function normalizeUrl(url) {
  try { return new URL(url, location.href).href; } catch { return String(url || ''); }
}

function targetIds(row) {
  return [
    row.murros_item_id,
    row.selitys_theme_id,
    row.selitys_model_id,
    row.selitys_generation_id
  ].filter(Boolean);
}

function infographicPayload(row) {
  return {
    id: row.id,
    url: row.url,
    storage_path: row.storage_path,
    caption: row.caption,
    content_summary: row.content_summary,
    purpose: row.purpose,
    sort_order: row.sort_order,
    unpublished: Boolean(row.unpublished)
  };
}

function indexInfographics(rows) {
  infographicRows = [...rows].sort((a, b) =>
    (a.sort_order ?? 1) - (b.sort_order ?? 1) || a.id - b.id
  );
  infographicsByTarget = new Map();
  infographicById = new Map();
  infographicByUrl = new Map();

  for (const source of infographicRows) {
    const row = { ...source, url: storageUrl(source.storage_path) };
    infographicById.set(String(row.id), row);
    if (row.url) infographicByUrl.set(normalizeUrl(row.url), row);
    for (const targetId of targetIds(row)) {
      if (!infographicsByTarget.has(targetId)) infographicsByTarget.set(targetId, []);
      infographicsByTarget.get(targetId).push(row);
    }
  }
}

async function loadInfographics() {
  let query = supabase
    .from('infographics')
    .select('id,storage_path,content_summary,purpose,caption,sort_order,murros_item_id,selitys_theme_id,selitys_model_id,selitys_generation_id,unpublished')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (!activeSession) query = query.eq('unpublished', false);
  const { data, error } = await query;
  if (error) throw error;
  indexInfographics(data || []);
}

function rowsForTarget(id) {
  return infographicsByTarget.get(id) || [];
}

function attachInfographics(entry) {
  if (!entry?.id) return entry;
  const rows = rowsForTarget(entry.id);
  const visibleRows = activeSession ? rows : rows.filter(row => !row.unpublished);
  const infographics = visibleRows.map(infographicPayload);
  const primary = infographics[0] || null;

  const next = {
    ...entry,
    infographics,
    images: infographics
  };

  if (activeSession) {
    next.unpublished = primary ? Boolean(primary.unpublished) : true;
    next.infographic_id = primary?.id ?? null;
  }

  if (entry.display && typeof entry.display === 'object') {
    next.display = {
      ...entry.display,
      image: primary?.url ?? null,
      image_status: primary ? (primary.unpublished ? 'unpublished' : 'published') : null
    };
  }
  return next;
}

function decorateAtlasData(data, url) {
  if (!data || typeof data !== 'object') return data;
  if (url.includes('selitysatlas.json')) {
    return {
      ...data,
      themes: Array.isArray(data.themes) ? data.themes.map(attachInfographics) : data.themes,
      models: Array.isArray(data.models) ? data.models.map(attachInfographics) : data.models,
      generations: Array.isArray(data.generations) ? data.generations.map(attachInfographics) : data.generations
    };
  }
  if (Array.isArray(data.items)) return { ...data, items: data.items.map(attachInfographics) };
  return data;
}

function installAtlasDataFilter() {
  if (window.__murrosAtlasFetchFiltered) return;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!ATLAS_DATA_FILES.some(file => url.includes(file)) || !response.ok) return response;

    const data = decorateAtlasData(await response.clone().json(), url);
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
  window.__murrosAtlasFetchFiltered = true;
}

function publicationForTarget(id) {
  const rows = rowsForTarget(id);
  return rows.length > 0 && rows.some(row => !row.unpublished);
}

async function updatePublication(id, published) {
  if (!activeSession) throw new Error('Admin-istunto ei ole voimassa.');
  const directRow = infographicById.get(String(id));
  const rows = directRow ? [directRow] : rowsForTarget(id);
  if (!rows.length) throw new Error(`Kohteelle ${id} ei löytynyt infografiikkaa.`);

  const ids = rows.map(row => row.id);
  const { data, error } = await supabase
    .from('infographics')
    .update({ unpublished: !published })
    .in('id', ids)
    .select('id,storage_path,content_summary,purpose,caption,sort_order,murros_item_id,selitys_theme_id,selitys_model_id,selitys_generation_id,unpublished');
  if (error) throw error;

  const replacements = new Map((data || []).map(row => [String(row.id), row]));
  indexInfographics(infographicRows.map(row => replacements.get(String(row.id)) || row));
  window.dispatchEvent(new CustomEvent('murros:publication-changed', {
    detail: { id, infographicIds: ids, published }
  }));
  return published;
}

function exposeAdminApi() {
  window.__murrosAdminApi = {
    get isAuthenticated() { return Boolean(activeSession); },
    get session() { return activeSession; },
    getPublication: publicationForTarget,
    getInfographics(id) { return rowsForTarget(id).map(infographicPayload); },
    getInfographicByUrl(url) {
      const row = infographicByUrl.get(normalizeUrl(url));
      return row ? infographicPayload(row) : null;
    },
    setPublication: updatePublication
  };
}

function addAdminToggle(figure) {
  if (!activeSession || figure.dataset.infographicAdmin === 'true') return;
  const image = figure.querySelector('img');
  if (!image) return;
  const row = infographicByUrl.get(normalizeUrl(image.currentSrc || image.src));
  if (!row) return;

  figure.dataset.infographicAdmin = 'true';
  const label = document.createElement('label');
  label.className = 'infographic-admin-toggle';
  Object.assign(label.style, {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '9px',
    padding: '8px 10px', border: '1px solid rgba(120,120,120,.28)',
    borderRadius: '8px', font: '500 12px system-ui,sans-serif', cursor: 'pointer'
  });
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !row.unpublished;
  const text = document.createElement('span');
  text.textContent = 'Julkaistu';
  label.append(checkbox, text);
  figure.appendChild(label);

  checkbox.addEventListener('change', async () => {
    checkbox.disabled = true;
    try {
      await updatePublication(row.id, checkbox.checked);
      text.textContent = checkbox.checked ? 'Julkaistu' : 'Piilotettu yleisöltä';
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error(error);
      alert(`Julkaisutilan tallennus epäonnistui: ${error.message}`);
    } finally {
      checkbox.disabled = false;
    }
  });
}

function enhanceInfographicAdmin(name) {
  adminObserver?.disconnect();
  adminObserver = null;
  if (!activeSession || !['verkko', 'matriisi'].includes(name)) return;

  const scan = () => root.querySelectorAll('.d-img, .card-images figure').forEach(addAdminToggle);
  scan();
  adminObserver = new MutationObserver(scan);
  adminObserver.observe(root, { childList: true, subtree: true });
}

async function showView(name, force = false) {
  if (switching || (!force && activeView === name)) return;
  switching = true;
  loader.hidden = false;
  try {
    adminObserver?.disconnect();
    if (activeModule?.unmount) await activeModule.unmount(root);
    const module = await VIEWS[name]();
    await module.mount(root, {
      theme: getTheme(),
      isAdmin: Boolean(activeSession),
      adminApi: window.__murrosAdminApi
    });
    activeModule = module;
    activeView = name;
    setActiveTab(name);
    enhanceInfographicAdmin(name);
    document.title = `${module.title || 'Murrosatlas'} · Murrosatlas`;
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="error"><strong>Näkymän lataus epäonnistui.</strong>\n\n${String(error?.stack || error)}</div>`;
  } finally {
    loader.hidden = true;
    switching = false;
  }
}

tabs.forEach(tab => tab.addEventListener('click', () => {
  const name = tab.dataset.view;
  if (name !== activeView) location.hash = name;
}));
window.addEventListener('hashchange', () => showView(selectedView()));
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
fsBtn.addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
window.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const map = { '1': 'rengas', '2': 'verkko', '3': 'matriisi', '4': 'paattely', '5': 'maisema', '6': 'atlasverkko' };
  if (map[event.key]) location.hash = map[event.key];
});

async function refreshSession(session) {
  const wasAdmin = Boolean(activeSession);
  activeSession = session || null;
  try { await loadInfographics(); }
  catch (error) { indexInfographics([]); console.error(error); }
  exposeAdminApi();
  if (activeView && wasAdmin !== Boolean(activeSession)) await showView(activeView, true);
}

async function startApp() {
  setTheme(getTheme(), false);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error(error);
  activeSession = session || null;
  try { await loadInfographics(); }
  catch (loadError) { indexInfographics([]); console.error(loadError); }
  exposeAdminApi();
  installAtlasDataFilter();
  await showView(selectedView());
  supabase.auth.onAuthStateChange((_event, nextSession) => queueMicrotask(() => refreshSession(nextSession)));
}

startApp();
