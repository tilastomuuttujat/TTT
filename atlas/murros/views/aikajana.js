import { mountCrosswalk, unmountCrosswalk } from './atlas-crosswalk.js';
export const title = 'Atlas-aikajana';
export const mount = root => mountCrosswalk(root, { mode: 'timeline', title: 'Atlas-aikajana' });
export const unmount = root => unmountCrosswalk(root);
export function setTheme() {}
