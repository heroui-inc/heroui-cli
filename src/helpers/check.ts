import type {PartialKey, RequiredKey, SAFE_ANY} from './type';
import type {ProblemRecord} from 'src/actions/doctor-action';

import {readFileSync} from 'node:fs';

import chalk from 'chalk';

import {type HeroUIComponents} from 'src/constants/component';
import {
  DOCS_INSTALLED,
  DOCS_TAILWINDCSS_SETUP,
  FRAMER_MOTION,
  HERO_UI,
  SYSTEM_UI,
  TAILWINDCSS,
  THEME_UI,
  appRequired,
  individualTailwindRequired,
  pnpmRequired,
  tailwindRequired
} from 'src/constants/required';
import {store} from 'src/constants/store';
import {compareVersions} from 'src/scripts/helpers';

import {getBetaVersionData} from './beta';
import {Logger} from './logger';
import {getMatchArray, getMatchImport} from './match';
import {findMostMatchText} from './math-diff';
import {getPackagePeerDep} from './upgrade';
import {strip} from './utils';

export type CheckType = 'all' | 'partial';
export type CombineType = 'missingDependencies' | 'incorrectTailwind' | 'incorrectApp';

type DefaultCombineOptions = {
  errorInfo: string[];
  missingDependencies: string[];
  tailwindName: string;
};

type CombineOptions<T extends CombineType> = T extends 'missingDependencies'
  ? RequiredKey<Partial<DefaultCombineOptions>, 'missingDependencies'>
  : T extends 'incorrectTailwind'
    ? RequiredKey<Partial<DefaultCombineOptions>, 'errorInfo' | 'tailwindName'>
    : T extends 'incorrectApp'
      ? RequiredKey<Partial<DefaultCombineOptions>, 'errorInfo'>
      : DefaultCombineOptions;

type CheckResult<T extends SAFE_ANY[] = SAFE_ANY[]> = [boolean, ...T];

export function combineProblemRecord<T extends CombineType = CombineType>(
  type: T,
  options: CombineOptions<T>
): ProblemRecord {
  const {errorInfo, missingDependencies, tailwindName} = options as DefaultCombineOptions;

  if (type === 'missingDependencies') {
    return {
      level: 'error',
      name: 'missingDependencies',
      outputFn: () => {
        Logger.log('You have not installed the required dependencies');
        Logger.newLine();
        Logger.log('The required dependencies are:');
        missingDependencies.forEach((dependency) => {
          Logger.log(`- ${dependency}`);
        });
        Logger.newLine();
        Logger.log(`See more info here: ${chalk.underline(DOCS_INSTALLED)}`);
      }
    };
  } else if (type === 'incorrectTailwind') {
    return {
      level: 'error',
      name: 'incorrectTailwind',
      outputFn: () => {
        Logger.log(`Your ${tailwindName} is incorrect`);
        Logger.newLine();
        Logger.log('The missing part is:');
        errorInfo.forEach((info) => {
          Logger.log(`- need to add ${info}`);
        });
        Logger.newLine();
        Logger.log(`See more info here: ${chalk.underline(`${DOCS_TAILWINDCSS_SETUP}-1`)}`);
      }
    };
  } else {
    return {
      level: 'error',
      name: 'incorrectApp',
      outputFn: () => {
        Logger.log('Your App.tsx is incorrect');
        Logger.newLine();
        Logger.log('The missing part is:');
        errorInfo.forEach((info) => {
          Logger.log(`- need to add ${info}`);
        });
        Logger.newLine();
        Logger.log(`See more info here: ${chalk.underline(DOCS_INSTALLED)}`);
      }
    };
  }
}

interface CheckPeerDependenciesConfig {
  peerDependencies?: boolean;
  allDependencies?: Record<string, SAFE_ANY>;
  packageNames?: string[];
  beta?: boolean;
}

/**
 * Check if the required content is installed
 * @example return result and missing required [false, '@heroui/react', 'framer-motion']
 * @param type
 * @param dependenciesKeys
 * @param checkPeerDependenciesConfig
 * @returns
 */
export async function checkRequiredContentInstalled<
  T extends CheckPeerDependenciesConfig = CheckPeerDependenciesConfig
>(
  type: CheckType,
  dependenciesKeys: Set<string>,
  checkPeerDependenciesConfig?: T extends {peerDependencies: infer P}
    ? P extends true
      ? PartialKey<Required<CheckPeerDependenciesConfig>, 'beta'>
      : T
    : T
): Promise<CheckResult> {
  const result = [] as unknown as CheckResult;
  const {allDependencies, beta, packageNames, peerDependencies} = (checkPeerDependenciesConfig ??
    {}) as Required<CheckPeerDependenciesConfig>;
  const peerDependenciesList: string[] = [];

  if (peerDependencies) {
    const peerDepList = await checkPeerDependencies({allDependencies, packageNames});

    peerDependenciesList.push(...peerDepList);
  }

  if (type === 'all') {
    const hasAllComponents = dependenciesKeys.has(HERO_UI);
    const hasFramerMotion = dependenciesKeys.has(FRAMER_MOTION);
    const hasTailwind = dependenciesKeys.has(TAILWINDCSS);

    if (hasAllComponents && hasFramerMotion && !peerDependenciesList.length) {
      return [true];
    }
    !hasAllComponents && result.push(beta ? `${HERO_UI}@${store.betaVersion}` : HERO_UI);
    !hasFramerMotion && result.push(FRAMER_MOTION);
    !hasTailwind && result.push(TAILWINDCSS);
  } else if (type === 'partial') {
    const hasFramerMotion = dependenciesKeys.has(FRAMER_MOTION);
    const hasTailwind = dependenciesKeys.has(TAILWINDCSS);
    const hasSystemUI = dependenciesKeys.has(SYSTEM_UI);
    const hasThemeUI = dependenciesKeys.has(THEME_UI);

    if (hasFramerMotion && hasSystemUI && hasThemeUI && !peerDependenciesList.length) {
      return [true];
    }
    !hasFramerMotion && result.push(FRAMER_MOTION);
    const betaSystemUI = await getBetaVersionData(SYSTEM_UI);
    const betaThemeUI = await getBetaVersionData(THEME_UI);

    !hasSystemUI && result.push(beta ? `${SYSTEM_UI}@${betaSystemUI}` : SYSTEM_UI);
    !hasThemeUI && result.push(beta ? `${THEME_UI}@${betaThemeUI}` : THEME_UI);
    !hasTailwind && result.push(TAILWINDCSS);
  }

  return [false, ...result, ...(peerDependencies ? peerDependenciesList : [])];
}

export async function checkPeerDependencies(
  config: Required<Pick<CheckPeerDependenciesConfig, 'allDependencies' | 'packageNames'>>
) {
  const {allDependencies, packageNames} = config;
  const peerDepList: string[] = [];

  for (const packageName of packageNames) {
    const result = await getPackagePeerDep(packageName, allDependencies, new Set());

    for (const peerData of result) {
      if (!peerData.isLatest) {
        // If there are not the latest version, add the peerDependencies to the list
        const findPeerDepIndex = peerDepList.findIndex((peerDep) =>
          peerDep.includes(peerData.package)
        );
        const findPeerDep = strip(peerDepList[findPeerDepIndex] || '');
        const findPeerDepVersion = findPeerDep?.match(/@([\d.]+)/)?.[1];

        // If the peerDependencies is not the latest version, remove the old version and add the latest version
        if (
          findPeerDepVersion &&
          compareVersions(findPeerDepVersion, strip(peerData.latestVersion)) <= 0
        ) {
          peerDepList.splice(findPeerDepIndex, 1);
        }
        peerDepList.push(`${peerData.package}@${peerData.latestVersion}`);
      }
    }
  }

  return peerDepList;
}

/**
 * Check if the tailwind.config file is correct
 * @param type
 * @param tailwindPath
 * @param currentComponents
 * @returns
 */
export function checkTailwind(
  type: 'all',
  tailwindPath: string,
  currentComponents?: HeroUIComponents,
  isPnpm?: boolean,
  content?: string,
  logWarning?: boolean
): CheckResult;
export function checkTailwind(
  type: 'partial',
  tailwindPath: string,
  currentComponents: HeroUIComponents,
  isPnpm: boolean,
  content?: string,
  logWarning?: boolean
): CheckResult;
export function checkTailwind(
  type: CheckType,
  tailwindPath: string,
  currentComponents?: HeroUIComponents,
  isPnpm?: boolean,
  content?: string,
  logWarning?: boolean
): CheckResult {
  if (type === 'partial' && !currentComponents!.length) {
    return [true];
  }

  const result = [] as unknown as CheckResult;

  const tailwindContent = content ?? readFileSync(tailwindPath, 'utf-8');

  const contentMatch = getMatchArray('content', tailwindContent);
  const pluginsMatch = getMatchArray('plugins', tailwindContent);

  if (type === 'all') {
    // Check if the required content is added Detail: https://heroui.com/docs/guide/installation#global-installation
    const darkMatch = getMatchArray('darkMode', tailwindContent);
    // Some tailwind.config.js use darkMode: 'class' not darkMode: ['class']
    const isDarkModeCorrect =
      darkMatch.some((darkMode) => darkMode.includes('class')) ||
      /darkMode:\s*["'`]class/.test(tailwindContent);
    const isContentCorrect = contentMatch.some((content) =>
      content.includes(tailwindRequired.content)
    );
    const isPluginsCorrect = pluginsMatch.some((plugins) =>
      tailwindRequired.checkPluginsRegex.test(plugins)
    );

    if (isDarkModeCorrect && isContentCorrect && isPluginsCorrect) {
      return [true];
    }
    !isDarkModeCorrect && result.push(tailwindRequired.darkMode);
    !isContentCorrect && result.push(tailwindRequired.content);
    !isPluginsCorrect && result.push(tailwindRequired.plugins);
  } else if (type === 'partial') {
    const individualContent = individualTailwindRequired.content(currentComponents!, isPnpm!);

    let isHaveAllContent = false;
    const isContentCorrect = contentMatch.some((content) => {
      // Add tailwindRequired.content check to the contentMatch, cause it is all include in the individualContent
      if (content.includes(tailwindRequired.content)) {
        isHaveAllContent = true;

        return true;
      }

      return content.includes(individualContent);
    });

    if (logWarning && isHaveAllContent) {
      Logger.log(
        `\n${chalk.yellow('Attention')} Individual components from HeroUI do not require the "${chalk.bold(
          tailwindRequired.content
        )}" in the tailwind config\nFor optimized bundle sizes, consider using "${chalk.bold(
          individualContent
        )}" instead`
      );
    }

    const isPluginsCorrect = pluginsMatch.some((plugins) =>
      tailwindRequired.checkPluginsRegex.test(plugins)
    );

    if (isContentCorrect && isPluginsCorrect) {
      return [true];
    }
    !isContentCorrect && result.push(individualContent);
    !isPluginsCorrect && result.push(tailwindRequired.plugins);
  }

  return [false, ...result];
}

export function checkApp(type: CheckType, appPath: string): CheckResult {
  const result = [] as unknown as CheckResult;

  if (type === 'all' || type === 'partial') {
    const appContent = readFileSync(appPath, 'utf-8');

    const importArray = getMatchImport(appContent);
    const isAppCorrect = importArray.some(([key]) => key!.includes(appRequired.import));

    if (isAppCorrect) {
      return [true];
    }

    !isAppCorrect && result.push(appRequired.import);
  }

  return [false, ...result];
}

export function checkPnpm(npmrcPath: string): CheckResult {
  const result = [] as unknown as CheckResult;

  let content: string;

  if (npmrcPath) {
    try {
      content = readFileSync(npmrcPath, 'utf-8');
      const isPnpmCorrect = content.includes(pnpmRequired.content);

      if (isPnpmCorrect) {
        return [true];
      }

      !isPnpmCorrect && result.push(pnpmRequired.content);
    } catch (error) {
      result.push(`Error reading .npmrc file: ${npmrcPath} \nError: ${error}`);
    }

    return [false, ...result];
  }

  return [false, ...result];
}

export async function checkIllegalComponents<T extends boolean = false>(
  components: string[] = [],
  loggerError = true
): Promise<T extends false ? boolean : string[]> {
  const illegalList: [string, null | string][] = [];

  for (const component of components) {
    if (!store.heroUIComponentsKeysSet.has(component)) {
      const matchComponent = findMostMatchText(store.heroUIComponentsKeys, component);

      illegalList.push([component, matchComponent]);
    }
  }

  if (illegalList.length) {
    const [illegalComponents, matchComponents] = illegalList.reduce(
      (acc, [illegalComponent, matchComponent]) => {
        return [
          acc[0] + chalk.underline(illegalComponent) + ', ',
          acc[1] + (matchComponent ? chalk.underline(matchComponent) + ', ' : '')
        ];
      },
      ['', '']
    );

    loggerError &&
      Logger.prefix(
        'error',
        `Illegal components: ${illegalComponents.replace(/, $/, '')}${
          matchComponents
            ? `\n${''.padEnd(12)}It may be a typo, did you mean ${matchComponents.replace(
                /, $/,
                ''
              )}?`
            : ''
        }`
      );

    return false as T extends false ? boolean : string[];
  }

  return true as T extends false ? boolean : string[];
}
