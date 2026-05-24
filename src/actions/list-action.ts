import type {CommandOptions} from '../helpers/type';

import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {HEROUI_PACKAGES} from 'src/constants/required';

import {resolver} from '../../src/constants/path';

export async function listAction(options: CommandOptions) {
  const {packagePath = resolver('package.json'), json} = options as CommandOptions & {json?: boolean};

  try {
    const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

    const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

    if (!installed.length) {
      if (json) {
        console.log(JSON.stringify({packages: []}, null, 2));
      } else {
        Logger.warn(
          'No HeroUI packages found. Run `heroui install` to install @heroui/react and @heroui/styles.'
        );
      }

      return;
    }

    const components = await transformPackageDetail(installed, allDependencies);

    if (json) {
      const output = {
        packages: components.map((c) => ({
          package: c.package,
          version: c.version.replace(/\s*new:\s*/, ' -> ').trim(),
          status: c.status,
          docs: c.docs
        }))
      };

      console.log(JSON.stringify(output, null, 2));
    } else {
      outputComponents({components, message: 'Installed HeroUI packages:\n'});
    }
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({error: String(error)}, null, 2));
    } else {
      Logger.prefix('error', `An error occurred while listing packages: ${error}`);
    }
  }

  process.exit(0);
}
