import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://zzbubbrsgiqsvsovkkmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YNqxZI4Oj-DSjVBoTKhQ2Q_4DchUIBb';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = selector => document.querySelector(selector);
const login = $('#login');
const admin = $('#admin');
const loginForm = $('#loginForm');
const loginMsg = $('#loginMsg');
const logoutBtn = $('#logoutBtn');
const chaptersEl = $('#chapters');
const emptyEl = $('#empty');
const statsEl = $('#stats');
const searchEl = $('#search');
const visibilityEl = $('#visibility');
const imageFilterEl = $('#imageFilter');
const toastEl = $('#toast');

let items = [];
let filtered = [];
let imageMap = new Map();
let loading = false;
let activeSession = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem('murros-theme', theme);
}
setTheme(localStorage.getItem('murros-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

function toast(message, error = false) {
  toastEl.textContent = message;
  toastEl.className = `toast on${error ? ' error' : ''}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toastEl.className = 'toast'; }, 3200);
}

async function loadImageMap() {
  imageMap = new Map();
  const response = await fetch('suomen_murrosvaiheet_syvennetty.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Infografiikka-JSON ei latautunut (${response.status})`);
  const data = await response.json();
  for (const item of data.items || []) {
    const first = Array.isArray(item.images) ? item.images.find(image => image?.url) : null;
    if (first) imageMap.set(item.id, first);
  }
}

async function loadItems() {
  if (loading || !activeSession) return;
  loading = true;
  admin.classList.add('saving');
  try {
    await loadImageMap();
    const { data, error } = await supabase
      .from('items')
      .select('id,title,year_start,year_end,type,phase,current_relevance,unpublished,updated_at')
      .order('year_start', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    items = data || [];
    applyFilters();
  } catch (error) {
    console.error(error);
    toast(`Lataus epäonnistui: ${error.message || error}`, true);
  } finally {
    loading = false;
    admin.classList.remove('saving');
  }
}

function applyFilters() {
  const query = searchEl.value.trim().toLocaleLowerCase('fi');
  const visibility = visibilityEl.value;
  const imageFilter = imageFilterEl.value;
  filtered = items.filter(item => {
    const haystack = `${item.title} ${item.id} ${item.year_start} ${item.year_end} ${item.type} ${item.phase || ''}`.toLocaleLowerCase('fi');
    if (query && !haystack.includes(query)) return false;
    const published = !item.unpublished;
    if (visibility === 'published' && !published) return false;
    if (visibility === 'hidden' && published) return false;
    const hasImage = imageMap.has(item.id);
    if (imageFilter === 'with' && !hasImage) return false;
    if (imageFilter === 'without' && hasImage) return false;
    return true;
  });
  render();
}

function decadeLabel(year) {
  const decade = Math.floor(Number(year || 0) / 10) * 10;
  return `${decade}-luku`;
}

function cardHtml(item) {
  const image = imageMap.get(item.id);
  const published = !item.unpublished;
  const year = item.year_end && item.year_end !== item.year_start ? `${item.year_start}–${item.year_end}` : item.year_start;
  const description = item.current_relevance || item.phase || 'Korttiin liitetty infografiikka.';
  return `<article class="story-card${published ? '' : ' hidden-card'}" data-id="${esc(item.id)}">
    <div class="visual">${image
      ? `<a href="${esc(image.url)}" target="_blank" rel="noopener"><img src="${esc(image.url)}" alt="${esc(image.caption || item.title)}" loading="lazy"></a>`
      : '<div class="no-image">Ei infografiikkaa</div>'}</div>
    <div class="card-body">
      <div class="meta"><span>${esc(year)}</span><span>·</span><span>${esc(item.type)}</span></div>
      <h4>${esc(item.title)}</h4>
      <p>${esc(description)}</p>
      <div class="publish-row">
        <div class="publish-copy"><b>${published ? 'Infografiikka julkaistu' : 'Infografiikka piilotettu'}</b><small>${image ? 'Muutos näkyy julkisessa atlaksessa seuraavalla latauksella.' : 'Kortilla ei ole kuvaa nykyisessä JSONissa.'}</small></div>
        <label class="switch" title="Vaihda infografiikan näkyvyys">
          <input class="publish-toggle" type="checkbox" ${published ? 'checked' : ''} ${image ? '' : 'disabled'}>
          <span class="track"></span>
        </label>
      </div>
    </div>
  </article>`;
}

function render() {
  const imageItems = items.filter(item => imageMap.has(item.id));
  const publishedImages = imageItems.filter(item => !item.unpublished).length;
  statsEl.innerHTML = [
    `Infografiikkoja <b>${imageItems.length}</b>`,
    `Julkaistu <b>${publishedImages}</b>`,
    `Piilotettu <b>${imageItems.length - publishedImages}</b>`,
    `Näytetään <b>${filtered.length}</b>`
  ].map(text => `<span>${text}</span>`).join('');

  const groups = new Map();
  for (const item of filtered) {
    const decade = Math.floor(Number(item.year_start || 0) / 10) * 10;
    if (!groups.has(decade)) groups.set(decade, []);
    groups.get(decade).push(item);
  }

  chaptersEl.innerHTML = [...groups.entries()].map(([decade, group]) => `
    <section class="chapter" id="d-${decade}">
      <div class="chapter-head"><div class="chapter-year">${decade}-luku</div><h3>${group.length === 1 ? esc(group[0].title) : `${group.length} murrosta ja näkökulmaa`}</h3></div>
      <div class="cards">${group.map(cardHtml).join('')}</div>
    </section>`).join('');

  emptyEl.hidden = filtered.length > 0;
  chaptersEl.querySelectorAll('.story-card').forEach(card => {
    const id = card.dataset.id;
    const toggle = card.querySelector('.publish-toggle');
    toggle?.addEventListener('change', event => updateVisibility(id, event.target.checked, card));
  });
}

async function updateVisibility(id, published, card) {
  const item = items.find(candidate => candidate.id === id);
  if (!item) return;
  const previous = item.unpublished;
  item.unpublished = !published;
  card.classList.add('saving');
  applyFilters();
  try {
    const { data, error } = await supabase
      .from('items')
      .update({ unpublished: !published })
      .eq('id', id)
      .select('id,unpublished')
      .single();
    if (error) throw error;
    item.unpublished = data.unpublished;
    toast(published ? 'Infografiikka julkaistiin.' : 'Infografiikka piilotettiin.');
    applyFilters();
  } catch (error) {
    item.unpublished = previous;
    applyFilters();
    toast(`Tallennus epäonnistui: ${error.message || error}`, true);
  }
}

async function applySession(session) {
  activeSession = session || null;
  const authenticated = Boolean(activeSession);
  login.hidden = authenticated;
  admin.hidden = !authenticated;
  logoutBtn.hidden = !authenticated;
  loginMsg.textContent = '';
  if (authenticated) await loadItems();
  else {
    items = [];
    filtered = [];
    imageMap.clear();
    chaptersEl.innerHTML = '';
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMsg.textContent = 'Kirjaudutaan…';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('#email').value.trim(),
    password: $('#password').value
  });
  if (error) {
    loginMsg.textContent = `Kirjautuminen epäonnistui: ${error.message}`;
    return;
  }
  await applySession(data.session);
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  await applySession(null);
});
$('#refreshBtn').addEventListener('click', loadItems);
searchEl.addEventListener('input', applyFilters);
visibilityEl.addEventListener('change', applyFilters);
imageFilterEl.addEventListener('change', applyFilters);

/* Älä tee tietokantahakuja suoraan auth-callbackin sisällä. */
supabase.auth.onAuthStateChange((_event, session) => {
  activeSession = session || null;
  queueMicrotask(() => applySession(activeSession));
});

const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError) {
  loginMsg.textContent = `Istunnon tarkistus epäonnistui: ${sessionError.message}`;
} else {
  await applySession(session);
}
