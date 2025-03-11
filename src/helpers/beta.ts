import {store} from 'src/constants/store';
import {getCacheExecData} from 'src/scripts/cache/cache';

import {Logger} from './logger';

export async function getBetaVersionData(component: string) {
  const data = await getCacheExecData<string>(
    `npm view ${component} dist-tags --json`,
    `Fetching ${component} tags`
  );

  return data;
}

export function getPrefixComponent(component: string) {
  return `@heroui/${component.replace('@heroui/', '')}`;
}

export async function getBetaVersion(componentName: string) {
  if (store.betaHeroUIComponentsPackageMap[componentName]) {
    return store.betaHeroUIComponentsPackageMap[componentName]!.version;
  }

  const data = await getBetaVersionData(componentName);

  try {
    return JSON.parse(data).beta;
  } catch (error) {
    Logger.error(`Get beta version error: ${error}`);
    process.exit(1);
  }
}

/**
 * @example Input: ["drawer"]
 *
 * Return:
 * ["@heroui/drawer@beta"]
 */
export async function getBetaComponents(components: string[]) {
  const componentsVersionList = await Promise.all(
    components.map(getPrefixComponent).map(async (c) => {
      const version = await getBetaVersion(c);

      return `${getPrefixComponent(c)}@${version}`;
    })
  );

  return componentsVersionList;
}
