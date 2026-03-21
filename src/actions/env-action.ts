import type {EnvOptions} from '@helpers/type';

import {outputComponents, outputInfo} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';

export async function envAction(options: EnvOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (installed.length) {
    const components = await transformPackageDetail([...installed], allDependencies);

    outputComponents({components, warnError: false});
  }

  outputInfo();

  process.exit(0);
}
