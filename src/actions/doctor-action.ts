import type {DoctorCommandOptions} from '@helpers/type';

import {statSync} from 'node:fs';
import {resolve} from 'node:path';

import chalk from 'chalk';
import {satisfies} from 'compare-versions';

import {getInstalledPackage} from '@helpers/installed-package';
import {exitWithJson} from '@helpers/json-output';
import {Logger, type PrefixLogType} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {strip} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {DOCS_INSTALLED, HEROUI_PACKAGES, TAILWINDCSS} from 'src/constants/required';

import pkg from '../../package.json';

export interface ProblemRecord {
  name: string;
  level: Extract<PrefixLogType, 'error' | 'warn'>;
  outputFn: () => void;
}

export async function doctorAction(options: DoctorCommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  getPackageInfo(packagePath);
  const projectPackagePath = statSync(packagePath).isDirectory()
    ? resolve(packagePath, 'package.json')
    : resolve(packagePath);
  const installed = HEROUI_PACKAGES.flatMap((name) => {
    const installedPackage = getInstalledPackage(name, projectPackagePath);

    return installedPackage ? [{name, ...installedPackage}] : [];
  });

  if (!installed.length) {
    const message = `❌ No ${chalk.underline(
      'HeroUI packages'
    )} found in your project. Please consult the installation guide at: https://heroui.com/docs/react/getting-started/quick-start`;

    exitWithJson({command: 'doctor', error: strip(message), ok: false}, 1);
    Logger.prefix('error', message);

    process.exit(1);
  }

  const issues: {
    currentVersion?: string;
    dependencies?: string[];
    level: Extract<PrefixLogType, 'error' | 'warn'>;
    name: string;
    packages?: string[];
    requiredVersion?: string;
  }[] = [];
  const problemRecord: ProblemRecord[] = [];
  const nodeVersion = process.versions.node;
  const requiredNodeVersion = pkg.engines.node;

  if (!satisfies(nodeVersion, requiredNodeVersion)) {
    issues.push({
      currentVersion: nodeVersion,
      level: 'error',
      name: 'unsupportedNodeVersion',
      requiredVersion: requiredNodeVersion
    });
    problemRecord.push({
      level: 'error',
      name: 'unsupportedNodeVersion',
      outputFn: () => {
        Logger.log(
          `Node.js v${nodeVersion} detected, but HeroUI CLI requires Node.js ${requiredNodeVersion}.`
        );
        Logger.newLine();
        Logger.log('Upgrade Node.js: https://nodejs.org/');
      }
    });
  }

  const tailwindInstalled =
    Boolean(getInstalledPackage(TAILWINDCSS, projectPackagePath)) ||
    installed.some((consumer) => getInstalledPackage(TAILWINDCSS, consumer.packagePath));

  if (!tailwindInstalled) {
    issues.push({
      level: 'error',
      name: 'missingTailwindCSS',
      packages: [TAILWINDCSS]
    });
    problemRecord.push({
      level: 'error',
      name: 'missingTailwindCSS',
      outputFn: () => {
        Logger.log('Tailwind CSS is not installed.');
        Logger.log('HeroUI v3 requires Tailwind CSS v4.');
        Logger.newLine();
        Logger.log(`Install it with: npm install ${TAILWINDCSS}@^4`);
        Logger.log(`See: ${chalk.underline(DOCS_INSTALLED)}`);
      }
    });
  }

  const missing = HEROUI_PACKAGES.filter((pkg) => !installed.some(({name}) => name === pkg));

  if (missing.length) {
    issues.push({
      level: 'warn',
      name: 'missingHeroUIPackages',
      packages: [...missing]
    });
    problemRecord.push({
      level: 'warn',
      name: 'missingHeroUIPackages',
      outputFn: () => {
        Logger.log('The following HeroUI packages are not installed:');
        missing.forEach((pkg) => {
          Logger.log(`- ${pkg}`);
        });
        Logger.newLine();
        Logger.log('Run `heroui install` to install them.');
      }
    });
  }

  const missingPeerDeps: string[] = [];
  const incompatiblePeerDeps: string[] = [];

  for (const consumer of installed) {
    for (const [peerPkg, peerRange] of Object.entries(consumer.manifest.peerDependencies ?? {})) {
      const peer = getInstalledPackage(peerPkg, consumer.packagePath);
      const requirement = `${peerRange}, required by: ${consumer.name}`;

      if (!peer) {
        if (
          !consumer.manifest.peerDependenciesMeta?.[peerPkg]?.optional &&
          !(peerPkg === TAILWINDCSS && !tailwindInstalled) &&
          !missing.some((name) => name === peerPkg)
        ) {
          missingPeerDeps.push(`${peerPkg} (${requirement})`);
        }
        continue;
      }

      if (!satisfies(peer.manifest.version, peerRange)) {
        incompatiblePeerDeps.push(
          `${peerPkg} (${requirement}, installed: ${peer.manifest.version})`
        );
      }
    }
  }

  if (missingPeerDeps.length) {
    issues.push({
      dependencies: missingPeerDeps,
      level: 'error',
      name: 'missingDependencies'
    });
    problemRecord.push({
      level: 'error',
      name: 'missingDependencies',
      outputFn: () => {
        Logger.log(
          'Required peer dependencies could not be resolved from the installed HeroUI packages:'
        );
        missingPeerDeps.forEach((dependency) => {
          Logger.log(`- ${dependency}`);
        });
        Logger.newLine();
        Logger.log(`See more info here: ${chalk.underline(DOCS_INSTALLED)}`);
      }
    });
  }

  if (incompatiblePeerDeps.length) {
    issues.push({
      dependencies: incompatiblePeerDeps,
      level: 'error',
      name: 'incompatibleDependencies'
    });
    problemRecord.push({
      level: 'error',
      name: 'incompatibleDependencies',
      outputFn: () => {
        Logger.log('Installed peer dependencies do not satisfy the required version ranges:');
        incompatiblePeerDeps.forEach((dependency) => {
          Logger.log(`- ${dependency}`);
        });
        Logger.newLine();
        Logger.log(`See more info here: ${chalk.underline(DOCS_INSTALLED)}`);
      }
    });
  }

  if (!problemRecord.length) {
    exitWithJson({command: 'doctor', issues: [], ok: true}, 0);
    Logger.newLine();
    Logger.success('✅ Your project has no detected issues.');

    return;
  }

  exitWithJson({command: 'doctor', issues, ok: false}, 1);

  const issueCount = problemRecord.length;
  const issueLabel = issueCount === 1 ? 'issue' : 'issues';
  const requireLabel = issueCount === 1 ? 'requires' : 'require';

  Logger.prefix(
    'error',
    `❌ Your project has ${chalk.underline(issueCount)} ${issueLabel} that ${requireLabel} attention`
  );
  Logger.newLine();

  for (let index = 0; index < problemRecord.length; index++) {
    const problem = problemRecord[index] as ProblemRecord;

    Logger[problem.level](`❗️Issue ${index + 1}: ${chalk.bold(problem.name)}`);
    Logger.newLine();
    problem.outputFn();
    Logger.newLine();
  }

  // Exit non-zero so `heroui doctor` is usable as a CI gate
  process.exit(1);
}
