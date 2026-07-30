(() => {
  'use strict';

  if (window.__murrosAtlasDataPathsRouted) return;

  const nativeFetch = window.fetch.bind(window);
  const redirects = new Map([
    ['suomen_murrosvaiheet_syvennetty.json', '../murrosatlas.json'],
    ['murrosatlas.json', '../murrosatlas.json'],
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

  window.__murrosAtlasDataPathsRouted = true;
})();
