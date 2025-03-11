import type {ExtractStoreData, SAFE_ANY} from '@helpers/type';

import {getBetaVersion} from '@helpers/beta';
import {type Components, getLatestVersion} from 'src/scripts/helpers';

import {HEROUI_CLI, HERO_UI} from './required';

export type HeroUIComponentsMap = Record<string, Components[0]>;

export type Store = {
  debug: boolean;
  beta: boolean;
  cliLatestVersion: string;
  latestVersion: string;
  betaVersion: string;

  // HeroUI
  heroUIComponents: Components;
  heroUIComponentsKeys: string[];
  heroUIcomponentsPackages: string[];
  heroUIComponentsKeysSet: Set<string>;
  heroUIComponentsMap: HeroUIComponentsMap;
  heroUIComponentsPackageMap: HeroUIComponentsMap;

  // Beta HeroUI
  betaHeroUIComponents: Components;
  betaHeroUIIComponentsKeys: string[];
  betaHeroUIcomponentsPackages: string[];
  betaHeroUIComponentsKeysSet: Set<string>;
  betaHeroUIComponentsMap: HeroUIComponentsMap;
  betaHeroUIComponentsPackageMap: HeroUIComponentsMap;
};

/* eslint-disable sort-keys-fix/sort-keys-fix, sort-keys */
export const store = {
  debug: false,
  beta: false,
  cliLatestVersion: '',
  latestVersion: '',
  betaVersion: '',

  betaHeroUIComponents: [],
  betaHeroUIIComponentsKeys: [],
  betaHeroUIComponentsKeysSet: new Set(),
  betaHeroUIComponentsMap: {},
  betaHeroUIComponentsPackageMap: {},
  betaHeroUIcomponentsPackages: [],

  heroUIComponents: [],
  heroUIComponentsKeys: [],
  heroUIComponentsKeysSet: new Set(),
  heroUIComponentsMap: {},
  heroUIComponentsPackageMap: {},
  heroUIcomponentsPackages: []
} as Store;
/* eslint-enable sort-keys-fix/sort-keys-fix, sort-keys */

export type StoreKeys = keyof Store;

export async function getStore<T extends StoreKeys = StoreKeys>(
  key: T
): Promise<ExtractStoreData<T>> {
  let data = store[key];

  if (!data) {
    if (key === 'latestVersion') {
      data = (await getLatestVersion(HERO_UI)) as SAFE_ANY;

      store[key] = data;
    } else if (key === 'cliLatestVersion') {
      data = (await getLatestVersion(HEROUI_CLI)) as SAFE_ANY;

      store[key] = data;
    } else if (key === 'betaVersion') {
      data = (await getBetaVersion(HERO_UI)) as SAFE_ANY;

      store[key] = data;
    }
  }

  return data as unknown as Promise<ExtractStoreData<T>>;
}

export function getStoreSync<T extends StoreKeys = StoreKeys>(key: T) {
  return store[key] as unknown as ExtractStoreData<T>;
}
