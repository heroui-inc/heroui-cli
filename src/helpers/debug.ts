import {writeFileSync} from 'node:fs';

import {getStoreSync, store} from 'src/constants/store';

import {catchPnpmExec} from './actions/upgrade/catch-pnpm-exec';
import {exec} from './exec';
import {Logger} from './logger';
import {getPackageInfo} from './package';

export async function debugExecAddAction(cmd: string, components: string[] = []) {
  if (getStoreSync('debug')) {
    for (const component of components) {
      Logger.warn(`Debug: ${component}`);
    }
  } else {
    await catchPnpmExec(() => exec(cmd));
  }
}

export function debugAddedPkg(components: string[], packagePath: string) {
  if (!components.length || !getStoreSync('debug')) return;

  const {dependencies, packageJson} = getPackageInfo(packagePath);

  for (const component of components) {
    const compData = store.heroUIComponentsMap[component];

    if (!compData) continue;

    dependencies[compData.package] = `${compData.package}@${compData.version}`;
  }
  writeFileSync(
    packagePath,
    JSON.stringify(
      {
        ...packageJson,
        dependencies
      },
      null,
      2
    ),
    'utf-8'
  );
}

export function debugRemovedPkg(components: string[], packagePath: string) {
  if (!components.length || !getStoreSync('debug')) return;

  const {dependencies, packageJson} = getPackageInfo(packagePath);

  for (const component of components) {
    const compData = store.heroUIComponentsMap[component];

    if (!compData) continue;
    delete dependencies[compData.package];
  }
  writeFileSync(
    packagePath,
    JSON.stringify(
      {
        ...packageJson,
        dependencies
      },
      null,
      2
    ),
    'utf-8'
  );
}
