export const title = 'Maisema 3D';

let frame = null;

export async function mount(root, context = {}) {
  const view = document.createElement('section');
  view.className = 'modular-view maisema-view';
  view.dataset.source = '../maisema.html';
  view.setAttribute('aria-label', 'Kolmiulotteinen historiamaisema');

  frame = document.createElement('iframe');
  frame.className = 'maisema-frame';
  frame.src = '../maisema.html';
  frame.title = 'Maisema 3D · Suomen rakennemuutosten atlas';
  frame.loading = 'eager';
  frame.allow = 'fullscreen';

  view.appendChild(frame);
  root.replaceChildren(view);
  setTheme(context.theme);
  return view;
}

export function unmount(root) {
  if (frame) {
    frame.src = 'about:blank';
    frame.remove();
    frame = null;
  }
  root.replaceChildren();
}

export function setTheme(theme) {
  if (!frame) return;
  frame.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  frame.contentWindow?.postMessage({ type: 'murros:theme', theme }, '*');
}