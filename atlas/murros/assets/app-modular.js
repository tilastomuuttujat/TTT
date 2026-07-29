const root = document.getElementById('viewRoot');
const loader = document.getElementById('loader');
const tabs = [...document.querySelectorAll('.tab')];
const themeBtn = document.getElementById('themeBtn');
const fsBtn = document.getElementById('fsBtn');

/* Loader pidetään näkymäjuuren ulkopuolella, jotta mount() ei poista sitä. */
document.body.appendChild(loader);

const THEME_KEY = 'murros-theme';
const SUPABASE_URL = 'https://zzbubbrsgiqsvsovkkmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YNqxZI4Oj-DSjVBoTKhQ2Q_4DchUIBb';
const ATLAS_DATA_FILE = 'suomen_murrosvaiheet_syvennetty.json';
const VIEWS = {
  rengas: () => import('../views/rengas.js'),
  verkko: () => import('../views/verkko.js'),
  matriisi: () => import('../views/matriisi.js')
};

let activeView = null;
let activeModule = null;
let switching = false;
let publishedInfographicIds = new Set();

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

async function loadPublishedInfographicIds() {
  const endpoint = `${SUPABASE_URL}/rest/v1/items?select=id&unpublished=eq.false`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Infografiikkojen julkaisuluettelon lataus epäonnistui (${response.status}).`);
  }

  const rows = await response.json();
  publishedInfographicIds = new Set(rows.map(row => row.id));
}

function filterInfographics(data) {
  if (!data || !Array.isArray(data.items)) return data;

  return {
    ...data,
    items: data.items.map(item => {
      if (publishedInfographicIds.has(item.id)) return item;
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

async function showView(name) {
  if (switching || activeView === name) return;
  switching = true;
  loader.hidden = false;

  try {
    if (activeModule?.unmount) {
      await activeModule.unmount(root);
    }

    const module = await VIEWS[name]();
    await module.mount(root, { theme: getTheme() });
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

themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

window.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const map = { '1': 'rengas', '2': 'verkko', '3': 'matriisi' };
  if (!map[event.key]) return;
  location.hash = map[event.key];
});

async function startApp() {
  setTheme(getTheme(), false);

  try {
    await loadPublishedInfographicIds();
  } catch (error) {
    /* Turvallinen oletus: tietokantavirheessä infografiikkoja ei julkaista. */
    publishedInfographicIds = new Set();
    console.error(error);
  }

  installAtlasDataFilter();
  await showView(selectedView());
}

startApp();
