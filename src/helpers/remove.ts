import type {Agent} from './detect';

import {exec} from './exec';
import {getPackageManagerInfo} from './utils';

export async function removeDependencies(components: string[], packageManager: Agent) {
  const {remove} = getPackageManagerInfo(packageManager);

  await exec(`${packageManager} ${remove} ${components.join(' ')}`);
}
