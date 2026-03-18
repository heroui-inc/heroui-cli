import type {PartialKey, RequiredKey, SAFE_ANY} from './type';
import type {ProblemRecord} from 'src/actions/doctor-action';

import {readFileSync} from 'node:fs';

import chalk from 'chalk';

import {
  DOCS_INSTALLED,
  DOCS_TAILWINDCSS_SETUP,
  FRAMER_MOTION,
  HERO_UI,
  TAILWINDCSS,
  appRequired,
  pnpmRequired,
  tailwindRequired
} from 'src/constants/required';
import {store} from 'src/constants/store';
import {compareVersions} from 'src/scripts/helpers';

import {Logger} from './logger';
import {getMatchArray, getMatchImport} from './match';
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
  const hasFramerMotion = dependenciesKeys.has(FRAMER_MOTION);
  const hasTailwind = dependenciesKeys.has(TAILWINDCSS);

  if (peerDependencies) {
    const peerDepList = await checkPeerDependencies({allDependencies, packageNames});

    peerDependenciesList.push(...peerDepList);
  }

  if (type === 'all') {
    const hasAllComponents = dependenciesKeys.has(HERO_UI);

    if (hasAllComponents && hasFramerMotion && hasTailwind && !peerDependenciesList.length) {
      return [true];
    }
    !hasAllComponents && result.push(beta ? `${HERO_UI}@${store.latestVersion}` : HERO_UI);
    !hasFramerMotion && result.push(FRAMER_MOTION);
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
        const findPeerDepIndex = peerDepList.findIndex((peerDep) =>
          peerDep.includes(peerData.package)
        );
        const findPeerDep = strip(peerDepList[findPeerDepIndex] || '');
        const findPeerDepVersion = findPeerDep?.match(/@([\d.]+)/)?.[1];

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
 */
export function checkTailwind(
  type: CheckType,
  tailwindPath: string,
  content?: string
): CheckResult {
  const result = [] as unknown as CheckResult;

  const tailwindContent = content ?? readFileSync(tailwindPath, 'utf-8');

  const contentMatch = getMatchArray('content', tailwindContent);
  const pluginsMatch = getMatchArray('plugins', tailwindContent);

  if (type === 'all') {
    const darkMatch = getMatchArray('darkMode', tailwindContent);
    const isDarkModeCorrect =
      darkMatch.some((darkMode) => darkMode.includes('class')) ||
      /darkMode:\s*["'`]class/.test(tailwindContent);
    const isContentCorrect = contentMatch.some((content) =>
      content.includes(tailwindRequired.content.replace('{js,ts,jsx,tsx}', ''))
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
