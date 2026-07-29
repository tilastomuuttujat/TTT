const root = document.getElementById('viewRoot');
const loader = document.getElementById('loader');
const tabs = [...document.querySelectorAll('.tab')];
const themeBtn = document.getElementById('themeBtn');
const fsBtn = document.getElementById('fsBtn');

/* Loader pidetään näkymäjuuren ulkopuolella, jotta mount() ei poista sitä. */
document.body.appendChild(loader);

const THEME_KEY = 'murros-theme';
const VIEWS = {
  rengas: () => import('../views/rengas.js'),
  verkko: () => import('../views/verkko.js'),
  matriisi: () => import('../views/matriisi.js')
};

let activeView = null;
let activeModule = null;
let switching = false;

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

function enhanceMountedView(name) {
  if (name !== 'rengas') return;

  const cards = ['card-title', 'card-legend', 'card-tips']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (cards.length !== 3 || document.getElementById('ringInfoPanel')) return;

  const panel = document.createElement('aside');
  panel.id = 'ringInfoPanel';
  panel.setAttribute('aria-label', 'Murrosrenkaan lukuohje');

  cards[0].parentNode.insertBefore(panel, cards[0]);
  cards.forEach(card => {
    card.removeAttribute('aria-hidden');
    panel.appendChild(card);
  });
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

setTheme(getTheme(), false);
showView(selectedView());