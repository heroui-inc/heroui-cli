import type {SAFE_ANY} from '@helpers/type';

import {getLatestVersion} from 'src/scripts/helpers';

import {HEROUI_CLI, HERO_UI} from './required';

export type Store = {
  debug: boolean;
  beta: boolean;
  cliLatestVersion: string;
  latestVersion: string;
};

/* eslint-disable sort-keys-fix/sort-keys-fix, sort-keys */
export const store = {
  debug: false,
  beta: false,
  cliLatestVersion: '',
  latestVersion: ''
} as Store;
/* eslint-enable sort-keys-fix/sort-keys-fix, sort-keys */

export type StoreKeys = keyof Store;

export async function getStore<T extends StoreKeys = StoreKeys>(key: T): Promise<SAFE_ANY> {
  let data = store[key];

  if (!data) {
    if (key === 'latestVersion') {
      data = (await getLatestVersion(HERO_UI)) as SAFE_ANY;

      store[key] = data;
    } else if (key === 'cliLatestVersion') {
      data = (await getLatestVersion(HEROUI_CLI)) as SAFE_ANY;

      store[key] = data;
    }
  }

  return data;
}

export function getStoreSync<T extends StoreKeys = StoreKeys>(key: T) {
  return store[key];
}
