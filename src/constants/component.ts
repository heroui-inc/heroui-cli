import type {Components} from 'src/scripts/helpers';

import {store} from './store';

export function getHerouiComponentsData(heroUIComponents: Components) {
  const heroUIComponentsKeys = heroUIComponents.map((component) => component.name);
  const heroUIcomponentsPackages = heroUIComponents.map((component) => component.package);

  const heroUIComponentsKeysSet = new Set(heroUIComponentsKeys);

  const heroUIComponentsMap = heroUIComponents.reduce((acc, component) => {
    acc[component.name] = component;

    return acc;
  }, {} as HeroUIComponentsMap);
  const heroUIComponentsPackageMap = heroUIComponents.reduce((acc, component) => {
    acc[component.package] = component;

    return acc;
  }, {} as HeroUIComponentsMap);

  return {
    heroUIComponentsKeys,
    heroUIComponentsKeysSet,
    heroUIComponentsMap,
    heroUIComponentsPackageMap,
    heroUIcomponentsPackages
  };
}

export function initStoreComponentsData({
  beta,
  heroUIComponents
}: {
  beta: boolean;
  heroUIComponents: Components;
}) {
  const {
    heroUIComponentsKeys,
    heroUIComponentsKeysSet,
    heroUIComponentsMap,
    heroUIComponentsPackageMap,
    heroUIcomponentsPackages
  } = getHerouiComponentsData(heroUIComponents);

  if (beta) {
    store.betaHeroUIComponents = heroUIComponents;
    store.betaHeroUIIComponentsKeys = heroUIComponentsKeys;
    store.betaHeroUIComponentsKeysSet = heroUIComponentsKeysSet;
    store.betaHeroUIComponentsMap = heroUIComponentsMap;
    store.betaHeroUIComponentsPackageMap = heroUIComponentsPackageMap;
    store.betaHeroUIcomponentsPackages = heroUIcomponentsPackages;
  } else {
    store.heroUIComponents = heroUIComponents;
    store.heroUIComponentsKeys = heroUIComponentsKeys;
    store.heroUIComponentsKeysSet = heroUIComponentsKeysSet;
    store.heroUIComponentsMap = heroUIComponentsMap;
    store.heroUIComponentsPackageMap = heroUIComponentsPackageMap;
    store.heroUIcomponentsPackages = heroUIcomponentsPackages;
  }
}

export type HeroUIComponentsMap = Record<string, (typeof store.heroUIComponents)[number]>;

export const orderHeroUIComponentKeys = ['package', 'version', 'status', 'docs'] as const;

export const colorHeroUIComponentKeys = ['package', 'version', 'status'];

// eslint-disable-next-line @typescript-eslint/ban-types
export type HeroUIComponentStatus = 'stable' | 'updated' | 'new' | (string & {});

export type HeroUIComponent = (typeof store.heroUIComponents)[0];

export type HeroUIComponents = (Omit<HeroUIComponent, 'status'> & {
  status: HeroUIComponentStatus;
  versionMode: string;
})[];

/**
 * Get the component data
 * isBeta --> betaHeroUIComponents
 * isStable --> heroUIComponents
 */
export function getComponentData() {
  if (store.beta) {
    return {
      components: store.betaHeroUIComponents,
      componentsKeys: store.betaHeroUIIComponentsKeys,
      componentsKeysSet: store.betaHeroUIComponentsKeysSet,
      componentsMap: store.betaHeroUIComponentsMap,
      componentsPackageMap: store.betaHeroUIComponentsPackageMap,
      componentsPackages: store.betaHeroUIcomponentsPackages
    };
  }

  return {
    components: store.heroUIComponents,
    componentsKeys: store.heroUIComponentsKeys,
    componentsKeysSet: store.heroUIComponentsKeysSet,
    componentsMap: store.heroUIComponentsMap,
    componentsPackageMap: store.heroUIComponentsPackageMap,
    componentsPackages: store.heroUIcomponentsPackages
  };
}
