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
const ATLAS_DATA_FILE = 'suomen_murrosvaiheet_syvennetty.json';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const VIEWS = {
  rengas: () => import('../views/rengas.js'),
  verkko: () => import('../views/verkko.js'),
  matriisi: () => import('../views/matriisi.js'),
  paattely: () => import('../views/paattely.js')
};

let activeView = null;
let activeModule = null;
let switching = false;
let activeSession = null;
let publicationById = new Map();

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
  tabs.forEach(tab => {
    tab.setAttribute('aria-selected', String(tab.dataset.view === name));
  });
}

async function loadPublicationState() {
  publicationById = new Map();

  if (activeSession) {
    const { data, error } = await supabase
      .from('items')
      .select('id,unpublished');
    if (error) throw error;
    for (const row of data || []) publicationById.set(row.id, Boolean(row.unpublished));
    return;
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/items?select=id&unpublished=eq.false`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Infografiikkojen julkaisuluettelon lataus epäonnistui (${response.status}).`);
  for (const row of await response.json()) publicationById.set(row.id, false);
}

function filterInfographics(data) {
  if (!data || !Array.isArray(data.items)) return data;

  return {
    ...data,
    items: data.items.map(item => {
      if (activeSession) {
        return {
          ...item,
          unpublished: publicationById.get(item.id) ?? true
        };
      }
      if (publicationById.get(item.id) === false) return item;
      if (!('images' in item)) return item;
      return { ...item, images: [] };
    })
  };
}

function installAtlasDataFilter() {
  if (window.__murrosAtlasFetchFiltered) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.includes(ATLAS_DATA_FILE) || !response.ok) return response;

    const data = filterInfographics(await response.clone().json());
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.__murrosAtlasFetchFiltered = true;
}

function exposeAdminApi() {
  window.__murrosAdminApi = {
    get isAuthenticated() { return Boolean(activeSession); },
    get session() { return activeSession; },
    getPublication(id) {
      return publicationById.has(id) ? !publicationById.get(id) : false;
    },
    getItemIdByTitle(title) {
      const normalized = String(title || '').trim();
      for (const [id] of publicationById) {
        const node = document.querySelector('circle')?.ownerSVGElement
          ? [...document.querySelectorAll('circle')].find(circle => circle.__data__?.id === id)
          : null;
        if (node?.__data__?.title === normalized) return id;
      }
      return null;
    },
    async setPublication(id, published) {
      if (!activeSession) throw new Error('Admin-istunto ei ole voimassa.');
      const { data, error } = await supabase
        .from('items')
        .update({ unpublished: !published })
        .eq('id', id)
        .select('id,unpublished')
        .single();
      if (error) throw error;
      publicationById.set(data.id, Boolean(data.unpublished));
      window.dispatchEvent(new CustomEvent('murros:publication-changed', {
        detail: { id: data.id, published: !data.unpublished }
      }));
      return !data.unpublished;
    }
  };
}

function enhanceMountedView(name) {
  if (name !== 'rengas') return;

  const cards = ['card-title', 'card-legend', 'card-tips']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (cards.length === 3 && !document.getElementById('ringInfoPanel')) {
    const panel = document.createElement('aside');
    panel.id = 'ringInfoPanel';
    panel.setAttribute('aria-label', 'Murrosrenkaan lukuohje');
    cards[0].parentNode.insertBefore(panel, cards[0]);
    cards.forEach(card => {
      card.removeAttribute('aria-hidden');
      panel.appendChild(card);
    });
  }

  const replay = document.getElementById('chainReplay');
  const close = document.getElementById('dClose');
  if (replay && close && !replay.dataset.closeEnhanced) {
    replay.dataset.closeEnhanced = 'true';
    replay.textContent = 'Sulje animaatio';
    replay.setAttribute('aria-label', 'Sulje animaatio ja vaikutusketju');
    replay.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      close.click();
    }, true);
  }
}

async function showView(name, force = false) {
  if (switching || (!force && activeView === name)) return;
  switching = true;
  loader.hidden = false;

  try {
    if (activeModule?.unmount) await activeModule.unmount(root);
    const module = await VIEWS[name]();
    await module.mount(root, {
      theme: getTheme(),
      isAdmin: Boolean(activeSession),
      adminApi: window.__murrosAdminApi
    });
    enhanceMountedView(name);
    activeModule = module;
    activeView = name;
    setActiveTab(name);
    document.title = `${module.title || 'Murrosatlas'} · Murrosatlas`;
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="error"><strong>Näkymän lataus epäonnistui.</strong>\n\n${String(error?.stack || error)}</div>`;
  } finally {
    loader.hidden = true;
    switching = false;
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.view;
    if (name === activeView) return;
    location.hash = name;
  });
});

window.addEventListener('hashchange', () => showView(selectedView()));
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});
window.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const map = { '1': 'rengas', '2': 'verkko', '3': 'matriisi', '4': 'paattely' };
  if (map[event.key]) location.hash = map[event.key];
});

async function refreshSession(session) {
  const wasAdmin = Boolean(activeSession);
  activeSession = session || null;
  try {
    await loadPublicationState();
  } catch (error) {
    publicationById = new Map();
    console.error(error);
  }
  exposeAdminApi();
  const isAdmin = Boolean(activeSession);
  if (activeView && wasAdmin !== isAdmin) await showView(activeView, true);
}

async function startApp() {
  setTheme(getTheme(), false);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error(error);
  activeSession = session || null;
  try {
    await loadPublicationState();
  } catch (loadError) {
    publicationById = new Map();
    console.error(loadError);
  }
  exposeAdminApi();
  installAtlasDataFilter();
  await showView(selectedView());

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    queueMicrotask(() => refreshSession(nextSession));
  });
}

startApp();
