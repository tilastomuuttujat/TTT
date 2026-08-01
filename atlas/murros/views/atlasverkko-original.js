export const title = 'Atlasverkko';

let frame = null;

export async function mount(root) {
  frame = document.createElement('iframe');
  frame.className = 'atlasverkko-original-frame';
  frame.src = './atlasverkko-original.html';
  frame.title = 'Atlasverkko: Verkko, Kehä ja Aikajana';
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('allow', 'fullscreen');
  Object.assign(frame.style, {
    display: 'block', width: '100%', height: '100%', border: '0', background: '#08090c'
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
  // Osa1:n oma tumma visuaalinen kieli säilytetään muuttamattomana.
}
