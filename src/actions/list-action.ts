import type {CommandOptions} from '../helpers/type';

import {exitWithJson, fail, rethrowIfExit} from '@helpers/json-output';
import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {type PackageComponent, getPackageInfo, transformPackageDetail} from '@helpers/package';
import {HEROUI_PACKAGES, HEROUI_PACKAGES_LABEL} from 'src/constants/required';

import {resolver} from '../../src/constants/path';

export async function listAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  try {
    const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

    const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

    if (!installed.length) {
      exitWithJson({command: 'list', ok: true, packages: []}, 0);
      Logger.warn(
        `No HeroUI packages found. Run \`heroui install\` to install ${HEROUI_PACKAGES_LABEL}.`
      );

      return;
    }

    const components = await transformPackageDetail(installed, allDependencies);

    exitWithJson({command: 'list', ok: true, packages: components.map(toJsonPackage)}, 0);
    outputComponents({components, message: 'Installed HeroUI packages:\n'});
  } catch (error) {
    rethrowIfExit(error);
    fail('list', `An error occurred while listing packages: ${error}`);
  }

  process.exit(0);
}

function toJsonPackage(component: PackageComponent) {
  const current = component.version.match(/^(.+?)\snew:/)?.[1]?.trim();
  const latest = component.version.match(/new:\s(.+)$/)?.[1]?.trim();

  return {
    description: component.description,
    docs: component.docs,
    latest: latest ?? current ?? component.version,
    package: component.package,
    version: current ?? component.version
  };
}
