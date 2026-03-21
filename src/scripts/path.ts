import {fileURLToPath} from 'node:url';

import {resolve} from 'pathe';

export const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

export const resolver = (path: string) => resolve(ROOT, path);

export const CACHE_DIR = resolve(ROOT, '..', 'node_modules/.heroui-cli-cache');
export const CACHE_PATH = resolve(`${CACHE_DIR}/data.json`);
