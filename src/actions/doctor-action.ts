import type {DoctorCommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {checkRequiredContentInstalled} from '@helpers/check';
import {Logger, type PrefixLogType} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {resolver} from 'src/constants/path';
import {DOCS_INSTALLED, HEROUI_PACKAGES} from 'src/constants/required';

export interface ProblemRecord {
  name: string;
  level: Extract<PrefixLogType, 'error' | 'warn'>;
  outputFn: () => void;
}

export async function doctorAction(options: DoctorCommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    Logger.prefix(
      'error',
      `❌ No ${chalk.underline(
        'HeroUI packages'
      )} found in your project. Please consult the installation guide at: https://heroui.com/docs/react/getting-started/quick-start`
    );

    return;
  }

  const problemRecord: ProblemRecord[] = [];

  const missing = HEROUI_PACKAGES.filter((pkg) => !allDependenciesKeys.has(pkg));

  if (missing.length) {
    problemRecord.push({
      level: 'warn',
      name: 'missingHeroUIPackages',
      outputFn: () => {
        Logger.log('The following HeroUI packages are not installed:');
        missing.forEach((pkg) => {
          Logger.log(`- ${pkg}`);
        });
        Logger.newLine();
        Logger.log('Run `heroui add` to install them.');
      }
    });
  }

  const [isCorrectInstalled, ...missingDependencies] = await checkRequiredContentInstalled(
    'all',
    allDependenciesKeys,
    {allDependencies, packageNames: [...installed], peerDependencies: true}
  );

  if (!isCorrectInstalled) {
    problemRecord.push({
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
    });
  }

  if (!problemRecord.length) {
    Logger.newLine();
    Logger.success('✅ Your project has no detected issues.');

    return;
  }

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
