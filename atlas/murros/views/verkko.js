import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Vaikutusverkko';

export async function mount(root, context = {}) {
  const view = await mountHtmlView(root, './verkko.html');
  setTheme(context.theme);
  return view;
}

export function unmount(root) {
  unmountHtmlView(root);
}

export function setTheme(theme) {
  window.postMessage({ type: 'murros:theme', theme }, '*');
}
