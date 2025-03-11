/* eslint-disable no-var */
import type {SAFE_ANY} from '@helpers/type';

import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import chalk from 'chalk';

import {checkIllegalComponents} from '@helpers/check';
import {detect} from '@helpers/detect';
import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {
  getPackageInfo,
  transformComponentsToPackage,
  transformPackageDetail
} from '@helpers/package';
import {removeDependencies, removeTailwind} from '@helpers/remove';
import {findFiles} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {
  DOCS_PROVIDER_SETUP,
  HERO_UI,
  SYSTEM_UI,
  THEME_UI,
  pnpmRequired
} from 'src/constants/required';
import {getAutocompleteMultiselect, getSelect} from 'src/prompts';

interface RemoveOptionsAction {
  packagePath: string;
  all?: boolean;
  tailwindPath?: string;
  prettier?: boolean;
}

export async function removeAction(components: string[], options: RemoveOptionsAction) {
  const {
    all = false,
    packagePath = resolver('package.json'),
    tailwindPath = findFiles('**/tailwind.config.(j|t)s')[0]
  } = options;

  var {allDependencies, allDependenciesKeys, currentComponents} = getPackageInfo(packagePath);
  const packageManager = await detect();
  const prettier = options.prettier ?? allDependenciesKeys.has('prettier');

  let isHeroUIAll = !!allDependencies[HERO_UI];

  // If no Installed HeroUI components then exit
  if (!currentComponents.length && !isHeroUIAll) {
    Logger.prefix('error', `No HeroUI components detected in your package.json at: ${packagePath}`);

    return;
  }

  if (all || isHeroUIAll) {
    components = isHeroUIAll ? [HERO_UI] : currentComponents.map((component) => component.package);
  } else if (!components.length) {
    components = await getAutocompleteMultiselect(
      'Select the components to remove',
      currentComponents.map((component) => {
        return {
          title: component.package,
          value: component.package
        };
      })
    );
  } else {
    // Check if the custom input components are valid
    if (!checkIllegalComponents(components)) {
      return;
    }

    // Transform components to package
    components = transformComponentsToPackage(components);
  }

  // Ask user whether need to remove these components
  const filteredComponents = components.includes(HERO_UI)
    ? await transformPackageDetail(components, allDependencies)
    : currentComponents.filter((component) =>
        components.some((c) => c.includes(component.package) || c.includes(component.name))
      );

  outputComponents({
    components: filteredComponents,
    message: chalk.yellowBright('❗️ Components slated for removal:')
  });

  const isRemove = await getSelect('Confirm removal of these components:', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isRemove) {
    // Exit the process
    process.exit(0);
  }

  /** ======================== Step 1 Remove dependencies ======================== */
  const removeDepList: string[] = [...components];
  const filterComponents = currentComponents.filter((c) => !components.includes(c.package));

  if (!filterComponents.length) {
    // Remove the selected components if not components leave then remove the theme-ui and system-ui
    allDependencies[THEME_UI] && removeDepList.push(THEME_UI);
    allDependencies[SYSTEM_UI] && removeDepList.push(SYSTEM_UI);
  }

  await removeDependencies(removeDepList, packageManager);

  /** ======================== Step 2 Remove the content ======================== */
  // Get the new package information
  var {allDependencies, currentComponents} = getPackageInfo(packagePath, false);

  isHeroUIAll = !!allDependencies[HERO_UI];

  const type: SAFE_ANY = isHeroUIAll ? 'all' : 'partial';

  removeTailwind(type, {
    currentComponents,
    isHeroUIAll,
    isPnpm: packageManager === 'pnpm',
    prettier,
    tailwindPath: tailwindPath!
  });

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
      `No HeroUI components remain installed. Ensure the HeroUIProvider is also removed if necessary.\nFor more information, visit: ${DOCS_PROVIDER_SETUP}`
    );
  }

  Logger.newLine();

  Logger.success(
    `✅ Successfully removed the specified HeroUI components: ${components
      .map((c) => chalk.underline(c))
      .join(', ')}`
  );

  process.exit(0);
}
