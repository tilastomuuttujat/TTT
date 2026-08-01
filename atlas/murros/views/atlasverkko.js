export const title = 'Atlasverkko';

let frame = null;
let objectUrl = null;

const MODULE_SOURCE = './views/atlasverkko-original.js';

async function readEmbeddedHtml() {
  const response = await fetch(MODULE_SOURCE, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Atlasverkon lähdemoduulia ei voitu ladata: HTTP ${response.status}`);
  }

  const source = await response.text();
  const match = source.match(/const\s+PAYLOAD\s*=\s*'([^']+)'\s*;/);
  if (!match) {
    throw new Error('Atlasverkon pakattua sisältöä ei löytynyt lähdemoduulista.');
  }

  if (!('DecompressionStream' in window)) {
    throw new Error('Selain ei tue Atlasverkon pakatun sisällön avaamista.');
  }

  const bytes = Uint8Array.from(
    atob(match[1]),
    character => character.charCodeAt(0),
  );

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  return new Response(stream).text();
}

export async function mount(root) {
  const html = await readEmbeddedHtml();

  /*
   * Blob-osoite antaa alkuperäiselle HTML:lle aidon dokumenttikontekstin.
   * <base> varmistaa, että ../murrosatlas.json, ../selitysatlas.json ja
   * ../crosswalk.json ratkaistaan atlas/murros/-hakemistosta käsin.
   */
  const baseUrl = new URL('./', window.location.href).href;
  const documentHtml = html.replace(
    /<head>/i,
    `<head><base href="${baseUrl}">`,
  );

  objectUrl = URL.createObjectURL(
    new Blob([documentHtml], { type: 'text/html;charset=utf-8' }),
  );

  frame = document.createElement('iframe');
  frame.className = 'atlasverkko-frame';
  frame.title = 'Atlasverkko — Verkko, Kehä ja Aikajana';
  frame.src = objectUrl;
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('allow', 'fullscreen');

  Object.assign(frame.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    minWidth: '0',
    minHeight: '0',
    border: '0',
    background: '#08090c',
  });

  root.replaceChildren(frame);
  return frame;
}

export function unmount(root) {
  frame?.remove();
  frame = null;

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  root.replaceChildren();
}

export function setTheme() {
  // Atlasverkko säilyttää alkuperäisen tumman visuaalisen kielensä.
}
