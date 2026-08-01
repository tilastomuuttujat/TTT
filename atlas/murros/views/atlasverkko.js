export const title = 'Atlasverkko';

let frame = null;

export async function mount(root) {
  frame = document.createElement('iframe');
  frame.className = 'atlasverkko-frame';
  frame.title = 'Atlasverkko — Verkko, Kehä ja Aikajana';
  frame.src = './atlasverkko.html';
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('allow', 'fullscreen');

  Object.assign(frame.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    minWidth: '0',
    minHeight: '0',
    border: '0',
    background: '#08090c'
  });

  root.replaceChildren(frame);
  return frame;
}

export function unmount(root) {
  frame?.remove();
  frame = null;
  root.replaceChildren();
}

export function setTheme() {
  // Atlasverkko säilyttää alkuperäisen tumman visuaalisen kielensä.
}
