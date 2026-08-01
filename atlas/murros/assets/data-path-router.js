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

  function installCrosswalkTabs() {
    const tabs = document.querySelector('.topbar .tabs');
    if (!tabs || tabs.querySelector('[data-crosswalk-link]')) return;

    const tulkinta = tabs.querySelector('a[href="../tulkinta.html"]');
    const links = [
      ['network', 'Atlasverkko'],
      ['radial', 'Kytkentäkehä'],
      ['timeline', 'Aikajana']
    ];

    for (const [view, label] of links) {
      const link = document.createElement('a');
      link.className = 'tab-link';
      link.dataset.crosswalkLink = view;
      link.href = `crosswalk.html?view=${view}`;
      link.innerHTML = `<span class="dot"></span>${label}`;
      tabs.insertBefore(link, tulkinta || null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installCrosswalkTabs, { once: true });
  } else {
    installCrosswalkTabs();
  }

  window.__murrosAtlasDataPathsRouted = true;
})();
