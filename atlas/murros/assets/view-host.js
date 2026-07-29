const mounted = {
  styles: [],
  scripts: [],
  cleanups: [],
  source: null
};

function absolutiseUrl(value, sourceUrl) {
  if (!value || /^(?:[a-z]+:|#|data:|javascript:)/i.test(value)) return value;
  return new URL(value, sourceUrl).href;
}

function fixRelativeUrls(root, sourceUrl) {
  root.querySelectorAll('[src]').forEach(el => {
    el.setAttribute('src', absolutiseUrl(el.getAttribute('src'), sourceUrl));
  });
  root.querySelectorAll('[href]').forEach(el => {
    el.setAttribute('href', absolutiseUrl(el.getAttribute('href'), sourceUrl));
  });
}

function installStyles(doc, sourceUrl) {
  const nodes = [...doc.head.querySelectorAll('style,link[rel="stylesheet"]')];
  return nodes.map(node => {
    const clone = node.cloneNode(true);
    clone.dataset.modularViewStyle = sourceUrl;
    if (clone.tagName === 'LINK') {
      clone.href = absolutiseUrl(clone.getAttribute('href'), sourceUrl);
    }
    document.head.appendChild(clone);
    mounted.styles.push(clone);
    return clone;
  });
}

async function executeScripts(doc, sourceUrl) {
  const scripts = [...doc.querySelectorAll('script')];

  for (const oldScript of scripts) {
    const src = oldScript.getAttribute('src');
    let code = oldScript.textContent || '';

    if (src) {
      const scriptUrl = absolutiseUrl(src, sourceUrl);
      const response = await fetch(scriptUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Skriptiä ei voitu ladata: ${response.status} ${scriptUrl}`);
      }
      code = await response.text();
    }

    if (!code.trim()) continue;

    /*
      Suoritetaan vanhan näkymän JavaScript omassa funktioalueessaan.
      Näin eri näkymien globaalit const/let-muuttujat eivät törmää toisiinsa.
      Palautettu cleanup-funktio on vapaaehtoinen tulevia aidosti modulaarisia
      näkymiä varten.
    */
    const run = new Function(
      'window',
      'document',
      'root',
      'registerCleanup',
      `${code}\n//# sourceURL=${src ? absolutiseUrl(src, sourceUrl) : sourceUrl}`
    );

    const registerCleanup = fn => {
      if (typeof fn === 'function') mounted.cleanups.push(fn);
    };

    const result = run(window, document, document.querySelector('.modular-view'), registerCleanup);
    if (typeof result === 'function') mounted.cleanups.push(result);
  }
}

export async function mountHtmlView(root, sourcePath) {
  const sourceUrl = new URL(sourcePath, window.location.href).href;
  mounted.source = sourceUrl;

  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Näkymää ei voitu ladata: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  installStyles(doc, sourceUrl);

  const fragment = document.createDocumentFragment();
  [...doc.body.childNodes].forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') return;
    fragment.appendChild(node.cloneNode(true));
  });

  const wrapper = document.createElement('section');
  wrapper.className = 'modular-view';
  wrapper.dataset.source = sourcePath;
  wrapper.appendChild(fragment);
  fixRelativeUrls(wrapper, sourceUrl);

  root.replaceChildren(wrapper);
  await executeScripts(doc, sourceUrl);

  return wrapper;
}

export function unmountHtmlView(root) {
  mounted.cleanups.splice(0).reverse().forEach(fn => {
    try { fn(); } catch (error) { console.warn('Näkymän siivous epäonnistui', error); }
  });
  mounted.scripts.forEach(node => node.remove());
  mounted.styles.forEach(node => node.remove());
  mounted.scripts.length = 0;
  mounted.styles.length = 0;
  mounted.source = null;
  root.replaceChildren();
}
