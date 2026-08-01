import { mountHtmlView, unmountHtmlView } from '../assets/view-host.js';

export const title = 'Atlasverkko';

export async function mount(root) {
  return mountHtmlView(root, './atlasverkko.html');
}

export function unmount(root) {
  unmountHtmlView(root);
}

export function setTheme() {
  // Atlasverkko säilyttää alkuperäisen tumman visuaalisen kielensä.
}
