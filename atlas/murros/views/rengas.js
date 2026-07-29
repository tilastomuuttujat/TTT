import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Murrosrengas';

let readingObserver = null;
let styleElement = null;

function injectReadingStyles() {
  if (document.getElementById('murros-ring-reading-enhancements')) return;

  styleElement = document.createElement('style');
  styleElement.id = 'murros-ring-reading-enhancements';
  styleElement.textContent = `
    #read .reading-context {
      max-width: 40em;
      margin: 18px 0 0;
      padding: 12px 15px;
      border-left: 3px solid var(--lake-ink);
      border-radius: 0 9px 9px 0;
      background: var(--card);
      color: var(--ink-soft);
      font-family: var(--ui);
      font-size: 13.5px;
      line-height: 1.5;
    }

    #read .reading-context strong {
      color: var(--ink);
    }

    #read .knot.focus {
      margin: 8px 0 12px;
      padding: 14px 16px 14px 18px;
      border: 1px solid rgba(185, 138, 46, .38);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(185, 138, 46, .11), var(--card));
    }

    #read .knot.focus::before {
      content: "Tästä tulkinta kertoo";
      display: block;
      margin-bottom: 5px;
      color: #B98A2E;
      font-family: var(--ui);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    #read .knot.focus .kd {
      left: -43px;
      top: 24px;
    }

    #read #storyBody > p:first-of-type {
      font-size: 18px;
      line-height: 1.6;
    }
  `;
  document.head.appendChild(styleElement);
}

function simplifyReadingView() {
  const read = document.getElementById('read');
  if (!read) return;

  const labels = [
    ['.rtop a[href="#claim"]', 'Pääajatus'],
    ['.rtop a[href="#story"]', 'Tiivistelmä'],
    ['.rtop a[href="#chain"]', 'Vaikutuspolku'],
    ['.rtop a[href="#caveats"]', 'Tulkinnan rajat']
  ];

  labels.forEach(([selector, text]) => {
    const element = read.querySelector(selector);
    if (element) element.textContent = text;
  });

  const claimKicker = read.querySelector('#claim .kicker');
  if (claimKicker) claimKicker.textContent = '1 · Ydinajatus — mitä tässä oikeastaan tapahtui';

  const storyKicker = read.querySelector('#story .kicker');
  if (storyKicker) storyKicker.textContent = '2 · Tiivistelmä — miksi tällä on väliä';

  const caveatKicker = read.querySelector('#caveats .kicker');
  if (caveatKicker) caveatKicker.textContent = '4 · Tulkinnan rajat — mitä aineisto kertoo ja mitä ei';

  const backButton = read.querySelector('#readBack');
  if (backButton) {
    const drawerOpen = document.getElementById('drawer')?.classList.contains('on');
    backButton.textContent = drawerOpen ? '← Takaisin ketjuun' : '← Takaisin kartalle';
  }
}

function cleanStoryBody() {
  const storyBody = document.getElementById('storyBody');
  if (!storyBody) return;

  storyBody.querySelectorAll('details').forEach(details => {
    const fragment = document.createDocumentFragment();
    [...details.children].forEach(child => {
      if (child.tagName !== 'SUMMARY') fragment.appendChild(child);
    });
    details.replaceWith(fragment);
  });

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

function updateReadingContext() {
  const claim = document.getElementById('claim');
  const claimMeta = document.getElementById('claimMeta');
  const spine = document.getElementById('spine');
  if (!claim || !claimMeta || !spine) return;

  let context = claim.querySelector('.reading-context');
  if (!context) {
    context = document.createElement('div');
    context.className = 'reading-context';
    claimMeta.insertAdjacentElement('afterend', context);
  }

  const knots = spine.querySelectorAll('.knot');
  const relations = spine.querySelectorAll('.joint');
  const currentTitle = claimMeta.querySelector('.badge.okra')?.textContent?.trim();

  if (relations.length > 0) {
    context.innerHTML = `<strong>${currentTitle || 'Tämä murros'}</strong> liittyy tässä tulkinnassa ${Math.max(0, knots.length - 1)} muuhun ilmiöön. Alla näkyy aineistosta muodostettu vahvin vaikutuspolku.`;
  } else if (knots.length > 1) {
    context.innerHTML = `<strong>${currentTitle || 'Tätä ilmiötä'}</strong> tarkastellaan suhteessa ${knots.length - 1} muuhun ilmiöön. Yhteydet ovat rinnastuksia, eivät välttämättä syy–seuraussuhteita.`;
  } else {
    context.innerHTML = `<strong>${currentTitle || 'Tämä ilmiö'}</strong> avataan ensin tiivistelmänä ja sen jälkeen aineiston sallimien yhteyksien kautta.`;
  }
}

function enhanceReadingView() {
  simplifyReadingView();
  cleanStoryBody();
  updateReadingContext();
}

function installReadingEnhancement() {
  injectReadingStyles();
  enhanceReadingView();

  const read = document.getElementById('read');
  if (!read) return;

  readingObserver = new MutationObserver(() => enhanceReadingView());
  readingObserver.observe(read, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

export async function mount(root, context = {}) {
  const view = await mountHtmlView(root, './rengas.html');
  setTheme(context.theme);
  installReadingEnhancement();
  return view;
}

export function unmount(root) {
  readingObserver?.disconnect();
  readingObserver = null;
  styleElement?.remove();
  styleElement = null;
  unmountHtmlView(root);
}

export function setTheme(theme) {
  window.postMessage({ type: 'murros:theme', theme }, '*');
}
