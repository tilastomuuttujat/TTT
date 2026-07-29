export const title = 'Päättely';

let frame = null;

export async function mount(root, context = {}) {
  const view = document.createElement('section');
  view.className = 'modular-view paattely-view';
  view.dataset.source = '../index.html';
  view.setAttribute('aria-label', 'Historiallinen päättelykone');

  frame = document.createElement('iframe');
  frame.className = 'paattely-frame';
  frame.src = '../index.html';
  frame.title = 'Päättely · Historiallinen päättelykone';
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
