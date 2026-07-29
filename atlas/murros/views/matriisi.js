import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Rakennematriisi';

let observer = null;
let styleEl = null;
let publicationListener = null;
let enhancementQueued = false;

function currentItemId(adminApi) {
  const urlId = new URLSearchParams(window.location.search).get('item');
  if (urlId) return urlId;

  const selected = document.querySelector('[data-matrix-node].selected');
  if (selected?.dataset.matrixNode) return selected.dataset.matrixNode;

  const title = document.querySelector('.dialog-body h2')?.textContent?.trim();
  return title ? adminApi?.getItemIdByTitle?.(title) || null : null;
}

function sectionHeading(text) {
  const heading = document.createElement('div');
  heading.className = 'matrix-reading-section-title';
  heading.textContent = text;
  return heading;
}

function addSectionHeading(panel, text) {
  if (!panel || panel.querySelector(':scope > .matrix-reading-section-title')) return;
  panel.prepend(sectionHeading(text));
}

function unifyDialog() {
  const dialog = document.querySelector('.overlay .dialog');
  if (!dialog || dialog.dataset.readingUnified === 'true') return;

  dialog.dataset.readingUnified = 'true';
  dialog.setAttribute('aria-label', 'Murroksen yhtenäinen lukusivu');

  const tabs = dialog.querySelector('.dialog-tabs');
  if (tabs) tabs.hidden = true;

  const panels = [...dialog.querySelectorAll('.tab-panel')];
  panels.forEach(panel => {
    panel.classList.add('active', 'matrix-reading-section');
    panel.hidden = false;
  });

  const articlePanel = dialog.querySelector('.articles-panel') || panels[1];
  const relationPanel = dialog.querySelector('.relation-panel') || panels[2];
  const cardPanel = panels.find(panel => panel !== articlePanel && panel !== relationPanel) || panels[0];

  addSectionHeading(cardPanel, 'Murros');
  addSectionHeading(articlePanel, 'Artikkeli');
  addSectionHeading(relationPanel, 'Yhteydet');

  articlePanel?.querySelectorAll('details.article-item').forEach(details => {
    details.open = true;
  });

  const infographic = dialog.querySelector('.card-images');
  if (infographic && articlePanel) {
    articlePanel.insertAdjacentElement('afterend', infographic);
    infographic.classList.add('matrix-reading-infographic');

    if (!infographic.querySelector(':scope > .matrix-reading-section-title')) {
      infographic.prepend(sectionHeading('Infografiikka'));
    }
  }

  if (relationPanel && infographic) {
    infographic.insertAdjacentElement('afterend', relationPanel);
  } else if (relationPanel && articlePanel) {
    articlePanel.insertAdjacentElement('afterend', relationPanel);
  }

  const close = dialog.querySelector('.close');
  if (close) {
    close.setAttribute('aria-label', 'Sulje lukusivu ja palaa matriisiin');
    close.title = 'Sulje ja palaa matriisiin';
  }
}

function installPublicationControl(adminApi) {
  if (!adminApi?.isAuthenticated) return;

  const dialog = document.querySelector('.overlay .dialog');
  const infographic = dialog?.querySelector('.matrix-reading-infographic, .card-images');
  if (!dialog || !infographic || infographic.querySelector('.infographic-admin-control')) return;

  const id = currentItemId(adminApi);
  if (!id) return;

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

  infographic.appendChild(control);

  const checkbox = control.querySelector('input');
  const copy = control.querySelector('.iac-copy b');
  const status = control.querySelector('.iac-status');

  checkbox.addEventListener('change', async () => {
    const next = checkbox.checked;
    checkbox.disabled = true;
    control.classList.add('saving');
    control.classList.remove('error');
    status.textContent = 'Tallennetaan…';

    try {
      const saved = await adminApi.setPublication(id, next);
      checkbox.checked = saved;
      copy.textContent = saved
        ? 'Infografiikka näkyy lukijoille'
        : 'Infografiikka on piilotettu';
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

function enhance(adminApi) {
  unifyDialog();
  installPublicationControl(adminApi);
}

function queueEnhancement(adminApi) {
  if (enhancementQueued) return;
  enhancementQueued = true;

  queueMicrotask(() => {
    enhancementQueued = false;
    observer?.disconnect();
    enhance(adminApi);
    observe(adminApi);
  });
}

function observe(adminApi) {
  if (!observer) {
    observer = new MutationObserver(() => queueEnhancement(adminApi));
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function installEnhancements(adminApi) {
  styleEl = document.createElement('style');
  styleEl.dataset.matriisiReading = 'true';
  styleEl.textContent = `
    /* Dialogi lisätään suoraan body-elementtiin: se alkaa yhteisen yläpalkin alta. */
    body > .overlay{
      top:var(--t-nav-h)!important;
      bottom:0!important;
      height:auto!important;
      padding:18px 24px 24px!important;
      z-index:1100!important;
      align-items:flex-start!important;
      overflow:auto!important;
    }
    body > .overlay .dialog{
      max-height:calc(100vh - var(--t-nav-h) - 36px)!important;
      margin:0 auto!important;
      scroll-padding-top:72px;
    }
    body > .overlay .dialog-head{
      top:0!important;
      z-index:20!important;
    }
    body > .overlay .dialog-head-actions{
      flex-shrink:0;
    }
    body > .overlay .close{
      position:relative!important;
      z-index:22!important;
      flex:none!important;
      background:var(--paper)!important;
      box-shadow:0 2px 10px rgba(20,30,27,.12);
    }

    /* Kortti, artikkeli ja yhteydet muodostavat yhden lukusivun. */
    .dialog[data-reading-unified="true"] .dialog-tabs{display:none!important}
    .dialog[data-reading-unified="true"] .tab-panel{
      display:block!important;
      opacity:1!important;
      transform:none!important;
      animation:none!important;
    }
    .dialog[data-reading-unified="true"] .matrix-reading-section,
    .dialog[data-reading-unified="true"] .matrix-reading-infographic{
      margin-top:34px;
      padding-top:30px;
      border-top:1px solid var(--line);
    }
    .dialog[data-reading-unified="true"] .matrix-reading-section:first-of-type{
      margin-top:0;
      padding-top:0;
      border-top:0;
    }
    .matrix-reading-section-title{
      margin:0 0 18px;
      color:var(--copper);
      font:600 10px/1.2 var(--mono);
      letter-spacing:.18em;
      text-transform:uppercase;
    }
    .dialog[data-reading-unified="true"] .article-item{
      background:transparent;
    }
    .dialog[data-reading-unified="true"] .matrix-reading-infographic{
      margin-bottom:0;
    }

    /* Sama julkaisukytkin kuin verkkomoduulissa. */
    .infographic-admin-control{display:grid;grid-template-columns:1fr auto;gap:10px 14px;align-items:center;margin:14px 0 0;padding:12px 13px;border:1px solid color-mix(in srgb,var(--copper) 38%,var(--line));border-radius:10px;background:color-mix(in srgb,var(--birch) 72%,var(--paper));box-shadow:0 3px 12px rgba(23,34,46,.07)}
    .infographic-admin-control.saving{opacity:.68}.infographic-admin-control.error{border-color:#a33}
    .iac-copy{display:flex;flex-direction:column;min-width:0}.iac-copy b{font-family:var(--serif);font-size:12.5px}.iac-copy small{font-size:10.5px;color:var(--muted)}
    .iac-kicker{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--copper);margin-bottom:2px}
    .iac-switch{position:relative;display:inline-flex;cursor:pointer}.iac-switch input{position:absolute;opacity:0;pointer-events:none}.iac-switch span{width:44px;height:24px;padding:3px;border-radius:999px;background:var(--line);transition:.16s}.iac-switch span::after{content:"";display:block;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.22);transition:.16s}.iac-switch input:checked+span{background:var(--copper)}.iac-switch input:checked+span::after{transform:translateX(20px)}.iac-switch input:focus-visible+span{outline:2px solid var(--copper);outline-offset:2px}.iac-switch input:disabled+span{cursor:wait}
    .iac-status{grid-column:1/-1;min-height:14px;font-family:var(--mono);font-size:9.5px;color:var(--muted)}

    @media(max-width:768px){
      body > .overlay{
        padding:10px 0 0!important;
        align-items:flex-end!important;
      }
      body > .overlay .dialog{
        max-height:calc(100vh - var(--t-nav-h) - 10px)!important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  enhance(adminApi);
  observe(adminApi);

  publicationListener = event => {
    const control = document.querySelector(
      `.infographic-admin-control[data-item-id="${CSS.escape(event.detail.id)}"]`
    );
    if (!control) return;

    const checkbox = control.querySelector('input');
    const copy = control.querySelector('.iac-copy b');
    checkbox.checked = event.detail.published;
    copy.textContent = event.detail.published
      ? 'Infografiikka näkyy lukijoille'
      : 'Infografiikka on piilotettu';
  };
  window.addEventListener('murros:publication-changed', publicationListener);
}

export async function mount(root, context = {}) {
  const view = await mountHtmlView(root, './matriisi.html');
  setTheme(context.theme);
  installEnhancements(context.adminApi || window.__murrosAdminApi);
  return view;
}

export function unmount(root) {
  observer?.disconnect();
  observer = null;
  enhancementQueued = false;
  styleEl?.remove();
  styleEl = null;

  if (publicationListener) {
    window.removeEventListener('murros:publication-changed', publicationListener);
  }
  publicationListener = null;

  unmountHtmlView(root);
}

export function setTheme(theme) {
  window.postMessage({ type: 'murros:theme', theme }, '*');
}
