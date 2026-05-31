import type {EnvOptions} from '@helpers/type';

import {Logger} from '@helpers/logger';
import {outputComponents, outputInfo} from '@helpers/output-info';
import {getPackageInfo, mapPackageComponentForJson, transformPackageDetail} from '@helpers/package';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';

export async function envAction(options: EnvOptions) {
  const {json, packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (json) {
    const components = installed.length
      ? await transformPackageDetail([...installed], allDependencies)
      : [];

    const output = {
      environment: {
        arch: process.arch,
        nodeVersion: process.version,
        os: process.platform
      },
      packages: components.map(mapPackageComponentForJson)
    };

    Logger.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  if (installed.length) {
    const components = await transformPackageDetail([...installed], allDependencies);

    outputComponents({components, warnError: false});
  }

  outputInfo();

  process.exit(0);
}
