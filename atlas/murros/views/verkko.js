import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Vaikutusverkko';

let observer = null;
let styleEl = null;
let publicationListener = null;

function findCurrentItemId(sidebar, adminApi) {
  const title = sidebar.querySelector('.d-title')?.textContent?.trim();
  if (!title) return null;

  const direct = adminApi?.getItemIdByTitle?.(title);
  if (direct) return direct;

  for (const circle of document.querySelectorAll('#graph circle')) {
    if (circle.__data__?.title === title) return circle.__data__.id;
  }
  return null;
}

function enhanceDetail(adminApi) {
  if (!adminApi?.isAuthenticated) return;
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || !sidebar.querySelector('.d-title')) return;
  if (sidebar.querySelector('.infographic-admin-control')) return;

  const id = findCurrentItemId(sidebar, adminApi);
  if (!id) return;

  const image = sidebar.querySelector('.d-img');
  if (!image) return;

  const published = adminApi.getPublication(id);
  const control = document.createElement('div');
  control.className = 'infographic-admin-control';
  control.dataset.itemId = id;
  control.innerHTML = `
    <div class="iac-copy">
      <span class="iac-kicker">Admin</span>
      <b>${published ? 'Infografiikka näkyy lukijoille' : 'Infografiikka on piilotettu'}</b>
      <small>Muutos tallentuu heti tietokantaan.</small>
    </div>
    <label class="iac-switch" title="Vaihda infografiikan näkyvyys">
      <input type="checkbox" ${published ? 'checked' : ''} aria-label="Julkaise infografiikka">
      <span></span>
    </label>
    <span class="iac-status" role="status"></span>`;

  image.insertAdjacentElement('afterend', control);
  const checkbox = control.querySelector('input');
  const copy = control.querySelector('.iac-copy b');
  const status = control.querySelector('.iac-status');

  checkbox.addEventListener('change', async () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    control.classList.add('saving');
    status.textContent = 'Tallennetaan…';
    try {
      const saved = await adminApi.setPublication(id, next);
      checkbox.checked = saved;
      copy.textContent = saved ? 'Infografiikka näkyy lukijoille' : 'Infografiikka on piilotettu';
      status.textContent = saved ? 'Julkaistu' : 'Piilotettu';
    } catch (error) {
      checkbox.checked = !next;
      status.textContent = `Virhe: ${error?.message || error}`;
      control.classList.add('error');
    } finally {
      checkbox.disabled = false;
      control.classList.remove('saving');
    }
  });
}

function installAdminEnhancement(adminApi) {
  if (!adminApi?.isAuthenticated) return;

  styleEl = document.createElement('style');
  styleEl.dataset.verkkoAdmin = 'true';
  styleEl.textContent = `
    .infographic-admin-control{display:grid;grid-template-columns:1fr auto;gap:10px 14px;align-items:center;margin:-4px 0 16px;padding:12px 13px;border:1px solid color-mix(in srgb,var(--accent) 38%,var(--hairline));border-radius:10px;background:color-mix(in srgb,var(--accent-soft) 72%,var(--panel));box-shadow:0 3px 12px rgba(23,34,46,.07)}
    .infographic-admin-control.saving{opacity:.68}.infographic-admin-control.error{border-color:var(--danger)}
    .iac-copy{display:flex;flex-direction:column;min-width:0}.iac-copy b{font-family:var(--font-display);font-size:12.5px}.iac-copy small{font-size:10.5px;color:var(--muted)}
    .iac-kicker{font-family:var(--font-mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:2px}
    .iac-switch{position:relative;display:inline-flex;cursor:pointer}.iac-switch input{position:absolute;opacity:0;pointer-events:none}.iac-switch span{width:44px;height:24px;padding:3px;border-radius:999px;background:var(--hairline);transition:.16s}.iac-switch span::after{content:"";display:block;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.22);transition:.16s}.iac-switch input:checked+span{background:var(--accent)}.iac-switch input:checked+span::after{transform:translateX(20px)}.iac-switch input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}.iac-switch input:disabled+span{cursor:wait}
    .iac-status{grid-column:1/-1;min-height:14px;font-family:var(--font-mono);font-size:9.5px;color:var(--muted)}
  `;
  document.head.appendChild(styleEl);

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  observer = new MutationObserver(() => queueMicrotask(() => enhanceDetail(adminApi)));
  observer.observe(sidebar, { childList: true, subtree: true });
  enhanceDetail(adminApi);

  publicationListener = event => {
    const control = sidebar.querySelector(`.infographic-admin-control[data-item-id="${CSS.escape(event.detail.id)}"]`);
    if (!control) return;
    const checkbox = control.querySelector('input');
    const copy = control.querySelector('.iac-copy b');
    checkbox.checked = event.detail.published;
    copy.textContent = event.detail.published ? 'Infografiikka näkyy lukijoille' : 'Infografiikka on piilotettu';
  };
  window.addEventListener('murros:publication-changed', publicationListener);
}

export async function mount(root, context = {}) {
  const view = await mountHtmlView(root, './verkko.html');
  setTheme(context.theme);
  installAdminEnhancement(context.adminApi || window.__murrosAdminApi);
  return view;
}

export function unmount(root) {
  observer?.disconnect();
  observer = null;
  styleEl?.remove();
  styleEl = null;
  if (publicationListener) window.removeEventListener('murros:publication-changed', publicationListener);
  publicationListener = null;
  unmountHtmlView(root);
}

export function setTheme(theme) {
  window.postMessage({ type: 'murros:theme', theme }, '*');
}