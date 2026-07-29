const mounted = {
  styles: [],
  scripts: [],
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

function executeScripts(doc, sourceUrl) {
  const scripts = [...doc.querySelectorAll('script')];
  for (const oldScript of scripts) {
    const script = document.createElement('script');
    const type = oldScript.getAttribute('type');
    if (type) script.type = type;

    const src = oldScript.getAttribute('src');
    if (src) {
      script.src = absolutiseUrl(src, sourceUrl);
      script.async = false;
    } else {
      script.textContent = `${oldScript.textContent}\n//# sourceURL=${sourceUrl}`;
    }

    script.dataset.modularViewScript = sourceUrl;
    document.body.appendChild(script);
    mounted.scripts.push(script);
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
  executeScripts(doc, sourceUrl);

  return wrapper;
}

export function unmountHtmlView(root) {
  mounted.scripts.forEach(node => node.remove());
  mounted.styles.forEach(node => node.remove());
  mounted.scripts.length = 0;
  mounted.styles.length = 0;
  mounted.source = null;
  root.replaceChildren();
}
