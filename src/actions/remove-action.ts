/* eslint-disable no-var */
import type {RemoveOptions} from '@helpers/type';

import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getInstalledHeroUIPackages, getPackageInfo, transformPackageDetail} from '@helpers/package';
import {removeDependencies} from '@helpers/remove';
import {resolver} from 'src/constants/path';
import {
  DOCS_PROVIDER_SETUP,
  HERO_UI,
  SYSTEM_UI,
  THEME_UI,
  pnpmRequired
} from 'src/constants/required';
import {getAutocompleteMultiselect, getSelect} from 'src/prompts';

export async function removeAction(components: string[], options: RemoveOptions) {
  const {all = false, packagePath = resolver('package.json')} = options;

  var {allDependencies} = getPackageInfo(packagePath);
  const packageManager = await detect();

  let currentComponents = getInstalledHeroUIPackages(allDependencies);
  let isHeroUIAll = !!allDependencies[HERO_UI];

  if (!currentComponents.length && !isHeroUIAll) {
    Logger.prefix('error', `No HeroUI packages detected in your package.json at: ${packagePath}`);

    return;
  }

  if (all || isHeroUIAll) {
    components = isHeroUIAll ? [HERO_UI] : currentComponents.map((component) => component.package);
  } else if (!components.length) {
    components = await getAutocompleteMultiselect(
      'Select the packages to remove',
      currentComponents.map((component) => {
        return {
          title: component.package,
          value: component.package
        };
      })
    );
  }

  const filteredComponents = components.includes(HERO_UI)
    ? await transformPackageDetail(components, allDependencies)
    : currentComponents.filter((component) =>
        components.some((c) => c.includes(component.package))
      );

  outputComponents({
    components: filteredComponents,
    message: chalk.yellowBright('❗️ Packages slated for removal:')
  });

  const isRemove = await getSelect('Confirm removal of these packages:', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isRemove) {
    process.exit(0);
  }

  /** ======================== Step 1 Remove dependencies ======================== */
  const removeDepList: string[] = [...components];
  const remainingComponents = currentComponents.filter((c) => !components.includes(c.package));

  if (!remainingComponents.length) {
    if (allDependencies[THEME_UI]) removeDepList.push(THEME_UI);
    if (allDependencies[SYSTEM_UI]) removeDepList.push(SYSTEM_UI);
  }

  await removeDependencies(removeDepList, packageManager);

  /** ======================== Step 2 Check remaining state ======================== */
  var {allDependencies} = getPackageInfo(packagePath);

  isHeroUIAll = !!allDependencies[HERO_UI];
  currentComponents = getInstalledHeroUIPackages(allDependencies);

  /** ======================== Step 3 Remove the pnpm ======================== */
  if (!currentComponents.length && !isHeroUIAll) {
    if (packageManager === 'pnpm') {
      const npmrcPath = resolver('.npmrc');

      if (existsSync(npmrcPath)) {
        let content = readFileSync(npmrcPath, 'utf-8');

        content = content.replace(pnpmRequired.content, '');

        Logger.newLine();
        Logger.info('Removing specified .npmrc file content');

        writeFileSync(npmrcPath, content, 'utf-8');
      }
    }

    Logger.newLine();
    Logger.warn(
      `No HeroUI packages remain installed. Ensure the HeroUIProvider is also removed if necessary.\nFor more information, visit: ${DOCS_PROVIDER_SETUP}`
    );
  }

  Logger.newLine();

  Logger.success(
    `✅ Successfully removed the specified HeroUI packages: ${components
      .map((c) => chalk.underline(c))
      .join(', ')}`
  );

  process.exit(0);
}
