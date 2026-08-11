export const title = 'Yhdistys';

const ASSOCIATION_URL = 'https://hyvinvointivaltio.github.io/home/hyvinvointivaltionvaalijat4.html';
let frame = null;

export async function mount(root, context = {}) {
  const view = document.createElement('section');
  view.className = 'modular-view yhdistys-view';
  view.dataset.source = ASSOCIATION_URL;
  view.setAttribute('aria-label', 'Hyvinvointivaltion Vaalijat ry');

  frame = document.createElement('iframe');
  frame.className = 'yhdistys-frame';
  frame.src = ASSOCIATION_URL;
  frame.title = 'Hyvinvointivaltion Vaalijat ry';
  frame.loading = 'eager';
  frame.allow = 'fullscreen';
  frame.style.display = 'block';
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  frame.style.background = '#f7f4ee';
  frame.style.colorScheme = context.theme === 'dark' ? 'dark' : 'light';

  view.appendChild(frame);
  root.replaceChildren(view);
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
  frame.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}
