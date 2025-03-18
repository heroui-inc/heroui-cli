import {store} from 'src/constants/store';
import {getLatestVersion} from 'src/scripts/helpers';

import {getBetaVersion} from './beta';

export async function getConditionVersion(packageName: string) {
  const conditionVersion = store.beta
    ? await getBetaVersion(packageName)
    : await getLatestVersion(packageName);

  return conditionVersion;
}
