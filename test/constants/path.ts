import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const TEST_ROOT = resolve(fileURLToPath(import.meta.url), '../..');
export const TEMP_ADD_DIR = join(TEST_ROOT, 'test-add-action');
