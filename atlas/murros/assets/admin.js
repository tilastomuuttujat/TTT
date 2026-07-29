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
const adminMsg = $('#adminMsg');
const logoutBtn = $('#logoutBtn');
const rowsEl = $('#rows');
const emptyEl = $('#empty');
const statsEl = $('#stats');
const searchEl = $('#search');
const visibilityEl = $('#visibility');
const imageFilterEl = $('#imageFilter');
const checkAllEl = $('#checkAll');

let items = [];
let filtered = [];
let selected = new Set();
let imageMap = new Map();
let loading = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem('murros-theme', theme);
}
setTheme(localStorage.getItem('murros-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

async function loadImageMap() {
  imageMap = new Map();
  try {
    const response = await fetch('suomen_murrosvaiheet_syvennetty.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`JSON ${response.status}`);
    const data = await response.json();
    for (const item of data.items || []) {
      const first = Array.isArray(item.images) ? item.images.find(image => image?.url) : null;
      if (first) imageMap.set(item.id, first);
    }
  } catch (error) {
    console.warn('Infografiikkojen esikatselut eivät latautuneet:', error);
  }
}

async function loadItems() {
  if (loading) return;
  loading = true;
  admin.classList.add('saving');
  adminMsg.textContent = 'Ladataan…';
  try {
    await loadImageMap();
    const { data, error } = await supabase
      .from('items')
      .select('id,title,year_start,year_end,type,unpublished,updated_at')
      .order('year_start', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    items = data || [];
    selected.clear();
    applyFilters();
    adminMsg.textContent = '';
  } catch (error) {
    console.error(error);
    adminMsg.textContent = `Lataus epäonnistui: ${error.message || error}`;
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
    const haystack = `${item.title} ${item.id} ${item.year_start} ${item.year_end} ${item.type}`.toLocaleLowerCase('fi');
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

function render() {
  const publishedCount = items.filter(item => !item.unpublished).length;
  const imageCount = items.filter(item => imageMap.has(item.id)).length;
  const publishedImages = items.filter(item => !item.unpublished && imageMap.has(item.id)).length;
  statsEl.innerHTML = [
    `Kortteja <b>${items.length}</b>`,
    `Julkaistuja <b>${publishedCount}</b>`,
    `Infografiikkoja <b>${imageCount}</b>`,
    `Näkyviä infografiikkoja <b>${publishedImages}</b>`,
    `Näytetään <b>${filtered.length}</b>`,
    `Valittu <b>${selected.size}</b>`
  ].map(text => `<span>${text}</span>`).join('');

  rowsEl.innerHTML = filtered.map(item => {
    const image = imageMap.get(item.id);
    const checked = selected.has(item.id) ? 'checked' : '';
    const published = !item.unpublished;
    const year = item.year_end && item.year_end !== item.year_start ? `${item.year_start}–${item.year_end}` : item.year_start;
    return `<tr data-id="${esc(item.id)}">
      <td><input class="row-check" type="checkbox" ${checked} aria-label="Valitse ${esc(item.title)}"></td>
      <td>${image ? `<a href="${esc(image.url)}" target="_blank" rel="noopener"><img class="thumb" src="${esc(image.url)}" alt="${esc(image.caption || item.title)}" loading="lazy"></a>` : '<span class="noimg">Ei kuvaa</span>'}</td>
      <td><div class="title">${esc(item.title)}</div><div class="meta">${esc(item.id)}</div></td>
      <td>${esc(year)}</td>
      <td>${esc(item.type)}</td>
      <td><label class="switch"><input class="publish-toggle" type="checkbox" ${published ? 'checked' : ''}><span class="track"></span><span class="state">${published ? 'Julkaistu' : 'Piilotettu'}</span></label></td>
    </tr>`;
  }).join('');

  emptyEl.hidden = filtered.length > 0;
  checkAllEl.checked = filtered.length > 0 && filtered.every(item => selected.has(item.id));
  checkAllEl.indeterminate = filtered.some(item => selected.has(item.id)) && !checkAllEl.checked;

  rowsEl.querySelectorAll('tr').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('.row-check').addEventListener('change', event => {
      event.target.checked ? selected.add(id) : selected.delete(id);
      render();
    });
    row.querySelector('.publish-toggle').addEventListener('change', event => {
      updateVisibility([id], event.target.checked, row);
    });
  });
}

async function updateVisibility(ids, published, row = null) {
  if (!ids.length) return;
  const targets = new Set(ids);
  const previous = items.filter(item => targets.has(item.id)).map(item => ({ id: item.id, unpublished: item.unpublished }));
  items.forEach(item => { if (targets.has(item.id)) item.unpublished = !published; });
  row?.classList.add('saving');
  adminMsg.textContent = `Tallennetaan ${ids.length} korttia…`;
  applyFilters();
  try {
    const { error } = await supabase.from('items').update({ unpublished: !published }).in('id', ids);
    if (error) throw error;
    adminMsg.textContent = published ? `${ids.length} korttia julkaistiin.` : `${ids.length} korttia piilotettiin.`;
  } catch (error) {
    previous.forEach(old => {
      const item = items.find(candidate => candidate.id === old.id);
      if (item) item.unpublished = old.unpublished;
    });
    applyFilters();
    adminMsg.textContent = `Tallennus epäonnistui: ${error.message || error}`;
  } finally {
    row?.classList.remove('saving');
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMsg.textContent = 'Kirjaudutaan…';
  const { error } = await supabase.auth.signInWithPassword({
    email: $('#email').value.trim(),
    password: $('#password').value
  });
  loginMsg.textContent = error ? `Kirjautuminen epäonnistui: ${error.message}` : '';
});

logoutBtn.addEventListener('click', () => supabase.auth.signOut());
$('#refreshBtn').addEventListener('click', loadItems);
searchEl.addEventListener('input', applyFilters);
visibilityEl.addEventListener('change', applyFilters);
imageFilterEl.addEventListener('change', applyFilters);

$('#selectVisible').addEventListener('click', () => {
  filtered.forEach(item => selected.add(item.id));
  render();
});
$('#clearSelection').addEventListener('click', () => {
  selected.clear();
  render();
});
checkAllEl.addEventListener('change', event => {
  filtered.forEach(item => event.target.checked ? selected.add(item.id) : selected.delete(item.id));
  render();
});
$('#publishSelected').addEventListener('click', () => updateVisibility([...selected], true));
$('#hideSelected').addEventListener('click', () => updateVisibility([...selected], false));

async function showSession(session) {
  const authenticated = Boolean(session);
  login.hidden = authenticated;
  admin.hidden = !authenticated;
  logoutBtn.hidden = !authenticated;
  if (authenticated) await loadItems();
  else {
    items = [];
    selected.clear();
    rowsEl.innerHTML = '';
  }
}

supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session } } = await supabase.auth.getSession();
await showSession(session);
