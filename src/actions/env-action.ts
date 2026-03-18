import type {EnvOptions} from '@helpers/type';

import {outputComponents, outputInfo} from '@helpers/output-info';
import {getInstalledHeroUIPackages, getPackageInfo} from '@helpers/package';
import {resolver} from 'src/constants/path';

export async function envAction(options: EnvOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies} = getPackageInfo(packagePath);
  const currentComponents = getInstalledHeroUIPackages(allDependencies);

  /** ======================== Output the current components ======================== */
  outputComponents({components: currentComponents});

  /** ======================== Output the system environment info ======================== */
  outputInfo();

  process.exit(0);
}
