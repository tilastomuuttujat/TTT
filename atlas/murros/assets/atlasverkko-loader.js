(() => {
  'use strict';

  const PARTS = [
    './assets/atlasverkko-app-1.part',
    './assets/atlasverkko-app-2.part',
    './assets/atlasverkko-app-3.part',
    './assets/atlasverkko-app-4.part'
  ];

  async function startAtlasverkko() {
    const sources = await Promise.all(PARTS.map(async path => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Atlasverkon koodiosaa ei voitu ladata: ${path} (HTTP ${response.status})`);
      return response.text();
    }));

    const source = sources.join('\n');
    const objectUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await import(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  startAtlasverkko().catch(error => {
    console.error(error);
    const stage = document.querySelector('main');
    if (stage) {
      stage.innerHTML = `<div class="data-error"><strong>Atlasverkon käynnistys epäonnistui.</strong><span>${String(error?.message || error)}</span></div>`;
    }
  });
})();
