import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Murrosrengas';

let readingObserver = null;
let styleElement = null;

const observerOptions = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['class']
};

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

    #read .reading-context strong { color: var(--ink); }

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

function setText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

function simplifyReadingView() {
  const read = document.getElementById('read');
  if (!read) return;

  [
    ['.rtop a[href="#claim"]', 'Pääajatus'],
    ['.rtop a[href="#story"]', 'Tiivistelmä'],
    ['.rtop a[href="#chain"]', 'Vaikutuspolku'],
    ['.rtop a[href="#caveats"]', 'Tulkinnan rajat']
  ].forEach(([selector, text]) => setText(read.querySelector(selector), text));

  setText(
    read.querySelector('#claim .kicker'),
    '1 · Ydinajatus — mitä tässä oikeastaan tapahtui'
  );
  setText(
    read.querySelector('#story .kicker'),
    '2 · Tiivistelmä — miksi tällä on väliä'
  );
  setText(
    read.querySelector('#caveats .kicker'),
    '4 · Tulkinnan rajat — mitä aineisto kertoo ja mitä ei'
  );

  const drawerOpen = document.getElementById('drawer')?.classList.contains('on');
  setText(
    read.querySelector('#readBack'),
    drawerOpen ? '← Takaisin ketjuun' : '← Takaisin kartalle'
  );
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

function setReadingContext(context, title, description) {
  const signature = `${title}\n${description}`;
  if (context.dataset.signature === signature) return;

  context.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = title;
  context.append(strong, document.createTextNode(` ${description}`));
  context.dataset.signature = signature;
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
  const currentTitle = claimMeta.querySelector('.badge.okra')?.textContent?.trim() || 'Tämä ilmiö';

  if (relations.length > 0) {
    setReadingContext(
      context,
      currentTitle,
      `liittyy tässä tulkinnassa ${Math.max(0, knots.length - 1)} muuhun ilmiöön. Alla näkyy aineistosta muodostettu vahvin vaikutuspolku.`
    );
  } else if (knots.length > 1) {
    setReadingContext(
      context,
      currentTitle,
      `tarkastellaan suhteessa ${knots.length - 1} muuhun ilmiöön. Yhteydet ovat rinnastuksia, eivät välttämättä syy–seuraussuhteita.`
    );
  } else {
    setReadingContext(
      context,
      currentTitle,
      'avataan ensin tiivistelmänä ja sen jälkeen aineiston sallimien yhteyksien kautta.'
    );
  }
}

function enhanceReadingView() {
  simplifyReadingView();
  cleanStoryBody();
  updateReadingContext();
}

function observeReadingView(read) {
  readingObserver?.observe(read, observerOptions);
}

function installReadingEnhancement() {
  injectReadingStyles();

  const read = document.getElementById('read');
  if (!read) return;

  enhanceReadingView();

  readingObserver = new MutationObserver(() => {
    readingObserver.disconnect();
    enhanceReadingView();
    observeReadingView(read);
  });
  observeReadingView(read);
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
