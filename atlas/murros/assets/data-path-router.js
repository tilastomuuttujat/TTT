(() => {
  'use strict';

  if (window.__murrosAtlasDataPathsRouted) return;

  const nativeFetch = window.fetch.bind(window);
  const redirects = new Map([
    ['suomen_murrosvaiheet_syvennetty.json', '../murrosatlas.json'],
    ['murrosatlas.json', '../murrosatlas.json'],
    ['selitysatlas.json', '../selitysatlas.json'],
    ['crosswalk.json', '../crosswalk.json'],
    ['artikkelit.json', '../artikkelit.json']
  ]);

  function routedUrl(input) {
    const raw = typeof input === 'string' ? input : input?.url;
    if (!raw) return null;

    let parsed;
    try {
      parsed = new URL(raw, location.href);
    } catch {
      return null;
    }

    const basename = parsed.pathname.split('/').pop();
    const target = redirects.get(basename);
    if (!target) return null;

    const routed = new URL(target, location.href);
    routed.search = parsed.search;
    routed.hash = parsed.hash;
    return routed.href;
  }

  window.fetch = (input, init) => {
    const target = routedUrl(input);
    if (!target) return nativeFetch(input, init);

    if (typeof input === 'string') return nativeFetch(target, init);

    const request = new Request(target, input);
    return nativeFetch(request, init);
  };

  function installExtraAtlasTabs() {
    const tabs = document.querySelector('.topbar .tabs');
    if (!tabs) return;

    const tulkinta = tabs.querySelector('a[href="../tulkinta.html"]');

    if (!tabs.querySelector('[data-view="atlasverkko"]')) {
      const button = document.createElement('button');
      button.className = 'tab';
      button.type = 'button';
      button.dataset.view = 'atlasverkko';
      button.setAttribute('aria-selected', 'false');
      button.innerHTML = '<span class="dot"></span>Atlasverkko';
      tabs.insertBefore(button, tulkinta || null);
    }
  }

  installExtraAtlasTabs();
  window.__murrosAtlasDataPathsRouted = true;
})();
