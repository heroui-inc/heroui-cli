import type {SAFE_ANY} from '@helpers/type';

import {getLatestVersion} from 'src/scripts/helpers';

import {HEROUI_CLI} from './required';

export type Store = {
  debug: boolean;
  cliLatestVersion: string;
};

/* eslint-disable sort-keys-fix/sort-keys-fix, sort-keys */
export const store = {
  debug: false,
  cliLatestVersion: ''
} as Store;
/* eslint-enable sort-keys-fix/sort-keys-fix, sort-keys */

export type StoreKeys = keyof Store;

export async function getStore<T extends StoreKeys = StoreKeys>(key: T): Promise<SAFE_ANY> {
  let data = store[key];

  if (!data && key === 'cliLatestVersion') {
    data = (await getLatestVersion(HEROUI_CLI)) as SAFE_ANY;

    store[key] = data;
  }

  return data;
}

export function getStoreSync<T extends StoreKeys = StoreKeys>(key: T) {
  return store[key];
}
