import type {CommandOptions} from '../helpers/type';

import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, mapPackageComponentForJson, transformPackageDetail} from '@helpers/package';
import {HEROUI_PACKAGES} from 'src/constants/required';

import {resolver} from '../../src/constants/path';

const NO_PACKAGES_MESSAGE =
  'No HeroUI packages found. Run `heroui install` to install @heroui/react and @heroui/styles.';

export async function listAction(options: CommandOptions) {
  const {json, packagePath = resolver('package.json')} = options;

  try {
    const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

    const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

    if (!installed.length) {
      // Always surface the human-readable hint, regardless of mode. In JSON
      // mode Logger.warn writes to stderr so the JSON on stdout stays clean
      // and pipe-parseable.
      Logger.warn(NO_PACKAGES_MESSAGE);

      if (json) {
        Logger.log(JSON.stringify({packages: []}, null, 2));
      }

      return;
    }

    const components = await transformPackageDetail(installed, allDependencies);

    if (json) {
      Logger.log(JSON.stringify({packages: components.map(mapPackageComponentForJson)}, null, 2));
    } else {
      outputComponents({components, message: 'Installed HeroUI packages:\n'});
    }
  } catch (error) {
    if (json) {
      Logger.error(JSON.stringify({error: String(error)}, null, 2));
    } else {
      Logger.prefix('error', `An error occurred while listing packages: ${error}`);
    }
  }

  process.exit(0);
}
