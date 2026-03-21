import {getCacheExecData} from 'src/scripts/cache/cache';

import {Logger} from './logger';

export async function getBetaVersionData(component: string) {
  const data = await getCacheExecData<string>(
    `npm view ${component} dist-tags --json`,
    `Fetching ${component} tags`
  );

  return data;
}

export async function getBetaVersion(componentName: string) {
  const data = await getBetaVersionData(componentName);

  try {
    return JSON.parse(data).beta;
  } catch (error) {
    Logger.error(`Get beta version error: ${error}`);
    process.exit(1);
  }
}
