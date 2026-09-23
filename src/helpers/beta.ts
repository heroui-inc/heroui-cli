import {getCacheExecData} from 'src/scripts/cache/cache';

import {Logger} from './logger';
import {safeJsonParse} from './utils';

export async function getBetaVersionData(component: string) {
  const data = await getCacheExecData<string>(
    `npm view ${component} dist-tags --json`,
    `Fetching ${component} tags`
  );

  return data;
}

export async function getBetaVersion(componentName: string) {
  const data = await getBetaVersionData(componentName);
  const distTags = safeJsonParse<Record<string, string>>(data, {});
  const betaVersion = distTags['beta'];

  if (!betaVersion) {
    Logger.error(`Could not read the beta dist-tag of ${componentName} from npm`);
    process.exit(1);
  }

  return betaVersion;
}
