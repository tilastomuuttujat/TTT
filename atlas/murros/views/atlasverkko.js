import { mountCrosswalk, unmountCrosswalk } from './atlas-crosswalk.js';
export const title = 'Atlasverkko';
export const mount = root => mountCrosswalk(root, { mode: 'network', title: 'Atlasverkko' });
export const unmount = root => unmountCrosswalk(root);
export function setTheme() {}
