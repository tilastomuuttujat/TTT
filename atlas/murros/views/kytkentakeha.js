import { mountCrosswalk, unmountCrosswalk } from './atlas-crosswalk.js';
export const title = 'Kytkentäkehä';
export const mount = root => mountCrosswalk(root, { mode: 'radial', title: 'Kytkentäkehä' });
export const unmount = root => unmountCrosswalk(root);
export function setTheme() {}
