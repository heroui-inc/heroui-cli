import {resolve} from 'pathe';

export const resolver = (path: string) => resolve(process.cwd(), path);
