import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Murrosrengas';

let storyObserver = null;

function simplifyReadingView() {
  const read = document.getElementById('read');
  if (!read) return;

  const claimNav = read.querySelector('.rtop a[href="#claim"]');
  if (claimNav) claimNav.textContent = 'Pääajatus';

  const storyNav = read.querySelector('.rtop a[href="#story"]');
  if (storyNav) storyNav.textContent = 'Tiivistelmä';

  const claimKicker = read.querySelector('#claim .kicker');
  if (claimKicker) claimKicker.textContent = '1 · Pääajatus — mitä tästä kannattaa ymmärtää';

  const storyKicker = read.querySelector('#story .kicker');
  if (storyKicker) storyKicker.textContent = '2 · Tiivistelmä — miksi tällä on väliä';
}

function cleanStoryBody() {
  const storyBody = document.getElementById('storyBody');
  if (!storyBody) return;

  /* Artikkelit ovat tässä näkymässä tiivistelmiä. Näytetään kaikki kappaleet
     suoraan eikä rakenneta keinotekoista "Lue koko artikkeli" -tasoa. */
  storyBody.querySelectorAll('details').forEach(details => {
    const fragment = document.createDocumentFragment();
    [...details.children].forEach(child => {
      if (child.tagName !== 'SUMMARY') fragment.appendChild(child);
    });
    details.replaceWith(fragment);
  });

  /* Sisäinen tuotantotilanne ei kuulu lukijalle. */
  storyBody.querySelectorAll('p').forEach(paragraph => {
    const text = paragraph.textContent || '';
    if (
      text.includes('Tekoälyavusteinen artikkeli') ||
      text.includes('odottaa kuratoijan katselmointia')
    ) {
      paragraph.remove();
    }
  });
}

function installReadingEnhancement() {
  simplifyReadingView();
  cleanStoryBody();

  const storyBody = document.getElementById('storyBody');
  if (!storyBody) return;

  storyObserver = new MutationObserver(() => cleanStoryBody());
  storyObserver.observe(storyBody, { childList: true, subtree: true });
}

export async function mount(root, context = {}) {
  const view = await mountHtmlView(root, './rengas.html');
  setTheme(context.theme);
  installReadingEnhancement();
  return view;
}

export function unmount(root) {
  storyObserver?.disconnect();
  storyObserver = null;
  unmountHtmlView(root);
}

export function setTheme(theme) {
  window.postMessage({ type: 'murros:theme', theme }, '*');
}
