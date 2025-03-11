import chalk from 'chalk';
import {basename} from 'pathe';

import {
  checkApp,
  checkPnpm,
  checkRequiredContentInstalled,
  checkTailwind,
  combineProblemRecord
} from '@helpers/check';
import {detect} from '@helpers/detect';
import {Logger, type PrefixLogType} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {findFiles, strip, transformOption} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {DOCS_PNPM_SETUP, DOCS_TAILWINDCSS_SETUP, HERO_UI} from 'src/constants/required';

interface DoctorActionOptions {
  packagePath?: string;
  tailwindPath?: string;
  appPath?: string;
  checkApp?: boolean | 'false';
  checkTailwind?: boolean | 'false';
  checkPnpm?: boolean | 'false';
}

export interface ProblemRecord {
  name: string;
  level: Extract<PrefixLogType, 'error' | 'warn'>;
  outputFn: () => void;
}

export async function doctorAction(options: DoctorActionOptions) {
  const {
    appPath = findFiles('**/App.(j|t)sx')[0],
    checkApp: _enableCheckApp = false,
    checkPnpm: _enableCheckPnpm = true,
    checkTailwind: _enableCheckTailwind = true,
    packagePath = resolver('package.json'),
    tailwindPath = findFiles('**/tailwind.config.(j|t)s')
  } = options;
  const enableCheckApp = transformOption(_enableCheckApp);
  const enableCheckPnpm = transformOption(_enableCheckPnpm);
  const enableCheckTailwind = transformOption(_enableCheckTailwind);
  const tailwindPaths = [tailwindPath].flat();

  const {allDependencies, allDependenciesKeys, currentComponents, isAllComponents} =
    getPackageInfo(packagePath);

  /** ======================== Output when there is no components installed ======================== */
  if (!currentComponents.length && !isAllComponents) {
    Logger.prefix(
      'error',
      `❌ No ${chalk.underline(
        'HeroUI components'
      )} found in your project. Please consult the installation guide at: https://heroui.com/docs/guide/installation#global-installation`
    );

    return;
  }

  /** ======================== Problem record ======================== */
  const problemRecord: ProblemRecord[] = [];

  /** ======================== Check whether installed redundant dependencies ======================== */
  if (isAllComponents && currentComponents.length) {
    problemRecord.push({
      level: 'warn',
      name: 'redundantDependencies',
      outputFn: () => {
        Logger.log(
          'You have installed some unnecessary dependencies. Consider removing them for optimal performance.'
        );
        Logger.newLine();
        Logger.log('The following dependencies are redundant:');
        currentComponents.forEach((component) => {
          Logger.log(`- ${component.package}`);
        });
      }
    });
  }
  // If there is no tailwind.config file
  if (enableCheckTailwind && !tailwindPaths.length) {
    problemRecord.push({
      level: 'error',
      name: 'missingTailwind',
      outputFn: () => {
        Logger.log(
          'Missing tailwind.config.(j|t)s file. To set up, visit: ' +
            chalk.underline(DOCS_TAILWINDCSS_SETUP)
        );
      }
    });
  }
  // If there is no App.tsx
  if (enableCheckApp && !appPath) {
    problemRecord.push({
      level: 'error',
      name: 'missingApp',
      outputFn: () => {
        Logger.log(
          'App.(j|t)sx file not found. Please specify the path using: doctor --appPath=[yourAppPath]'
        );
      }
    });
  }

  /** ======================== Check if the allComponents required dependencies installed ======================== */
  if (isAllComponents) {
    // Check if framer-motion allComponents is installed
    let [isCorrectInstalled, ...missingDependencies] = await checkRequiredContentInstalled(
      'all',
      allDependenciesKeys,
      {allDependencies, packageNames: [HERO_UI], peerDependencies: true}
    );

    // Check if other allComponents are installed
    if (currentComponents.length) {
      const [_isCorrectInstalled, ..._missingDependencies] = await checkRequiredContentInstalled(
        'partial',
        allDependenciesKeys,
        {
          allDependencies,
          packageNames: currentComponents.map((c) => c.package),
          peerDependencies: true
        }
      );

      isCorrectInstalled = _isCorrectInstalled || isCorrectInstalled;
      // Combine missing dependencies
      missingDependencies = [..._missingDependencies, ...missingDependencies].filter(
        (c, index, arr) => {
          c = strip(c).replace(/@[\d.]+/g, '');

          return arr.findIndex((d) => strip(d).replace(/@[\d.]+/g, '') === c) === index;
        }
      );
    }

    if (!isCorrectInstalled) {
      problemRecord.push(combineProblemRecord('missingDependencies', {missingDependencies}));
    }

    // Check whether tailwind.config file is correct
    if (enableCheckTailwind) {
      for (const tailwindPath of tailwindPaths) {
        const [isCorrectTailwind, ...errorInfo] = checkTailwind('all', tailwindPath);

        if (!isCorrectTailwind) {
          const tailwindName = basename(tailwindPath);

          problemRecord.push(combineProblemRecord('incorrectTailwind', {errorInfo, tailwindName}));
        }
      }
    }

    // Check whether the App.tsx is correct
    if (enableCheckApp && appPath) {
      const [isAppCorrect, ...errorInfo] = checkApp('all', appPath);

      if (!isAppCorrect) {
        problemRecord.push(combineProblemRecord('incorrectApp', {errorInfo}));
      }
    }
  } else if (currentComponents.length) {
    // Individual components check
    const [isCorrectInstalled, ...missingDependencies] = await checkRequiredContentInstalled(
      'partial',
      allDependenciesKeys,
      {
        allDependencies,
        packageNames: currentComponents.map((c) => c.package),
        peerDependencies: true
      }
    );

    if (!isCorrectInstalled) {
      problemRecord.push(combineProblemRecord('missingDependencies', {missingDependencies}));
    }

    // Check whether tailwind.config file is correct
    if (enableCheckTailwind) {
      const isPnpm = (await detect()) === 'pnpm';

      for (const tailwindPath of tailwindPaths) {
        const [isCorrectTailwind, ...errorInfo] = checkTailwind(
          'partial',
          tailwindPath,
          currentComponents,
          isPnpm,
          undefined,
          true
        );

        if (!isCorrectTailwind) {
          const tailwindName = basename(tailwindPath);

          problemRecord.push(combineProblemRecord('incorrectTailwind', {errorInfo, tailwindName}));
        }
      }
    }

    // Check whether the App.tsx is correct
    if (enableCheckApp && appPath) {
      const [isAppCorrect, ...errorInfo] = checkApp('partial', appPath);

      if (!isAppCorrect) {
        problemRecord.push(combineProblemRecord('incorrectApp', {errorInfo}));
      }
    }
  }

  /** ======================== Check whether Pnpm setup is correct ======================== */
  if (enableCheckPnpm) {
    const currentPkgManager = await detect();

    if (currentPkgManager === 'pnpm') {
      const npmrcPath = resolver('.npmrc');

      const [isCorrect, ...errorInfo] = checkPnpm(npmrcPath);

      if (!isCorrect) {
        problemRecord.push({
          level: 'error',
          name: 'incorrectPnpm',
          outputFn: () => {
            Logger.log(
              'The pnpm setup is incorrect \nPlease update your configuration according to the guidelines provided at: ' +
                chalk.underline(DOCS_PNPM_SETUP)
            );
            Logger.newLine();
            Logger.log('Required changes:');
            errorInfo.forEach((info) => {
              Logger.log(`- Add ${info}`);
            });
          }
        });
      }
    }
  }

  /** ======================== Return when there is no problem ======================== */
  if (!problemRecord.length) {
    Logger.newLine();
    Logger.success('✅ Your project has no detected issues.');

    return;
  }

  /** ======================== Output the problem record ======================== */
  Logger.prefix(
    'error',
    `❌ Your project has ${chalk.underline(problemRecord.length)} issue${
      problemRecord.length === 1 ? '' : 's'
    } that require attention`
  );
  Logger.newLine();

  for (let index = 0; index < problemRecord.length; index++) {
    const problem = problemRecord[index] as ProblemRecord;

    Logger[problem.level](`❗️Issue ${index + 1}: ${chalk.bold(problem.name)}`);
    Logger.newLine();
    problem.outputFn();
    Logger.newLine();
  }

  process.exit(0);
}
