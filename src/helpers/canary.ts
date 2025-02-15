import {store} from 'src/constants/store';

import {getPackageVersionData, getPrefixComponent} from './beta';
import {Logger} from './logger';

export async function getCanaryVersion(componentName: string) {
  if (store.canaryHeroUIComponentsPackageMap[componentName]) {
    return store.canaryHeroUIComponentsPackageMap[componentName]!.version;
  }

  const data = await getPackageVersionData(componentName);

  try {
    return JSON.parse(data).canary;
  } catch (error) {
    Logger.error(`Get canary version error: ${error}`);
    process.exit(1);
  }
}

/**
 * @example Input: ["drawer"]
 *
 * Return:
 * ["@nextui-org/drawer@canary"]
 */
export async function getCanaryComponents(components: string[]) {
  const componentsVersionList = await Promise.all(
    components.map(getPrefixComponent).map(async (c) => {
      const version = await getCanaryVersion(c);

      return `${getPrefixComponent(c)}@${version}`;
    })
  );

  return componentsVersionList;
}
