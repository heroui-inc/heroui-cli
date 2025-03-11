/* eslint-disable no-var */
import type {SAFE_ANY} from '@helpers/type';

import {existsSync, writeFileSync} from 'node:fs';

import chalk from 'chalk';

import {getBetaComponents} from '@helpers/beta';
import {
  checkApp,
  checkIllegalComponents,
  checkPnpm,
  checkRequiredContentInstalled,
  checkTailwind
} from '@helpers/check';
import {debugAddedPkg, debugExecAddAction, debugRemovedPkg} from '@helpers/debug';
import {detect} from '@helpers/detect';
import {fixPnpm, fixProvider, fixTailwind} from '@helpers/fix';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {findFiles, strip} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {
  DOCS_PROVIDER_SETUP,
  HERO_UI,
  individualTailwindRequired,
  pnpmRequired
} from 'src/constants/required';
import {getStoreSync, store} from 'src/constants/store';
import {tailwindTemplate} from 'src/constants/templates';
import {getAutocompleteMultiselect} from 'src/prompts';

interface AddActionOptions {
  all?: boolean;
  prettier?: boolean;
  packagePath?: string;
  tailwindPath?: string;
  appPath?: string;
  addApp?: boolean;
  beta?: boolean;
}

export async function addAction(components: string[], options: AddActionOptions) {
  const {
    addApp = false,
    all = false,
    appPath,
    beta = false,
    packagePath = resolver('package.json'),
    tailwindPath = findFiles('**/tailwind.config.(j|t)s')[0]
  } = options;

  var {allDependencies, allDependenciesKeys, currentComponents} = getPackageInfo(packagePath);
  const prettier = options.prettier ?? allDependenciesKeys.has('prettier');

  const isHeroUIAll = !!allDependencies[HERO_UI];

  if (!components.length && !all) {
    const filteredComponents = store.heroUIComponents.filter(
      (component) =>
        !currentComponents.some((currentComponent) => currentComponent.name === component.name)
    );

    if (!filteredComponents.length) {
      Logger.success('✅ All components have been added');
      process.exit(0);
    }

    components = await getAutocompleteMultiselect(
      'Which components would you like to add?',
      filteredComponents.map((component) => {
        return {
          description: component.description,
          title: component.name,
          value: component.name
        };
      })
    );
  } else if (all) {
    components = [HERO_UI];
  }

  /** ======================== Add judge whether illegal component exist ======================== */
  if (!all && !checkIllegalComponents(components, true)) {
    return;
  }

  // Check whether have added the HeroUI components
  var {allDependenciesKeys, currentComponents} = getPackageInfo(packagePath);

  const currentComponentsKeys = currentComponents.map((c) => c.name);
  const filterCurrentComponents = components.filter(
    (c) => currentComponentsKeys.includes(c) || (isHeroUIAll && c === HERO_UI)
  );

  if (filterCurrentComponents.length && !getStoreSync('debug')) {
    Logger.prefix(
      'error',
      `❌ You have already added the following components: ${filterCurrentComponents
        .map((c) => chalk.underline(c))
        .join(', ')}`
    );

    return;
  }

  // Check whether the App.tsx file exists
  if (addApp && !appPath) {
    Logger.prefix(
      'error',
      "❌ App.(j|t)sx file not found. Please specify the appPath if the default search path does not locate your file.  'add --appPath=yourAppPath'"
    );

    return;
  }

  const currentPkgManager = await detect();
  const runCmd = currentPkgManager === 'npm' ? 'install' : 'add';

  /** ======================== Step 1 Add dependencies required ======================== */
  if (all) {
    let [, ...missingDependencies] = await checkRequiredContentInstalled(
      'all',
      allDependenciesKeys,
      {allDependencies, beta, packageNames: [HERO_UI], peerDependencies: true}
    );

    missingDependencies = missingDependencies.map((c) => strip(c));

    if (missingDependencies.length) {
      Logger.info(
        `Adding required dependencies: ${[...missingDependencies]
          .map((c) => chalk.underline(c))
          .join(', ')}`
      );

      await debugExecAddAction(
        `${currentPkgManager} ${runCmd} ${[...missingDependencies].join(' ')}`,
        missingDependencies
      );
    }
  } else {
    const mergedComponents = beta
      ? await getBetaComponents(components)
      : components.map((c) => store.heroUIComponentsMap[c]!.package);
    const [, ..._missingDependencies] = await checkRequiredContentInstalled(
      'partial',
      allDependenciesKeys,
      {
        allDependencies,
        beta,
        packageNames: mergedComponents,
        peerDependencies: true
      }
    );
    const missingDependencies = [..._missingDependencies, ...mergedComponents].map((c) => strip(c));

    Logger.info(
      `Adding required dependencies: ${[...missingDependencies]
        .map((c) => chalk.underline(c))
        .join(', ')}`
    );

    await debugExecAddAction(
      `${currentPkgManager} ${runCmd} ${[...missingDependencies].join(' ')}`,
      missingDependencies
    );
  }

  if (getStoreSync('debug')) {
    // Temporarily add the components to the package.json file
    debugAddedPkg(components, packagePath);
  }

  // After install the required dependencies, get the latest package information
  var {allDependenciesKeys, currentComponents} = getPackageInfo(packagePath);

  /** ======================== Step 2 Tailwind CSS Setup ======================== */
  const type: SAFE_ANY = all ? 'all' : 'partial';

  const isPnpm = currentPkgManager === 'pnpm';

  if (!tailwindPath) {
    const individualContent = individualTailwindRequired.content(currentComponents, isPnpm);
    const template = tailwindTemplate(type, individualContent);
    const tailwindPath = resolver('tailwind.config.js');

    writeFileSync(tailwindPath, template, 'utf-8');

    Logger.newLine();
    Logger.info(`Tailwind CSS configuration file created at: ${tailwindPath}`);
  } else {
    const [, ...errorInfoList] = checkTailwind(
      type,
      tailwindPath,
      currentComponents,
      isPnpm,
      undefined,
      true
    );

    fixTailwind(type, {errorInfoList, format: prettier, tailwindPath});

    Logger.newLine();
    Logger.log(`Tailwind CSS settings have been updated in: ${tailwindPath}`);
  }

  /** ======================== Step 3 Provider Need Manually Open ======================== */
  if (addApp && appPath && existsSync(appPath)) {
    const [isCorrectProvider] = checkApp(type, appPath);

    if (!isCorrectProvider) {
      fixProvider(appPath, {format: prettier});

      Logger.newLine();
      Logger.info(`HeroUIProvider successfully added to the App file at: ${appPath}`);
      Logger.warn(
        "Please check the placement of HeroUIProvider in the App file to ensure it's correctly integrated.'"
      );
    }
  }

  /** ======================== Step 4 Setup Pnpm ======================== */
  if (currentPkgManager === 'pnpm') {
    const npmrcPath = resolver('.npmrc');

    if (!existsSync(npmrcPath)) {
      writeFileSync(resolver('.npmrc'), pnpmRequired.content, 'utf-8');
    } else {
      const [isCorrectPnpm] = checkPnpm(npmrcPath);

      if (!isCorrectPnpm) {
        fixPnpm(npmrcPath);
      }
    }
  }

  // Finish adding the HeroUI components
  Logger.newLine();
  Logger.success('✅ Components added successfully');

  // Check whether the user has installed the All HeroUI components
  if ((allDependenciesKeys.has(HERO_UI) || all) && currentComponents.length) {
    // Check whether have added redundant dependencies
    Logger.newLine();
    Logger.log(
      `${chalk.yellow('Attention')} Individual components from HeroUI do not require the \`@heroui/react\` package. For optimized bundle sizes, consider using individual components.`
    );
    Logger.log('The redundant dependencies are:');
    [...new Set(currentComponents)].forEach((component) => {
      Logger.log(`- ${component.package}`);
    });
  }

  // Warn the user to check the HeroUIProvider whether in the correct place
  Logger.newLine();
  Logger.grey(
    `Please check the ${chalk.bold(
      'HeroUIProvider'
    )} whether in the correct place (ignore if added)\nSee more info here: ${DOCS_PROVIDER_SETUP}`
  );

  if (getStoreSync('debug')) {
    // Temporarily remove the added components from the package.json file
    debugRemovedPkg(components, packagePath);
  }
  process.exit(0);
}
