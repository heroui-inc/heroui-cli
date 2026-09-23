import type {DoctorCommandOptions, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';

import {Logger, type PrefixLogType} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {getVersionAndMode, transformPeerVersion} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {DOCS_INSTALLED, HEROUI_PACKAGES} from 'src/constants/required';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {compareVersions} from 'src/scripts/helpers';

/**
 * Minimum Node.js version, kept in sync with `engines.node` in package.json.
 * Tailwind CSS is intentionally NOT checked separately here: it is a peer
 * dependency of @heroui/react and is already covered by the peer-dependency
 * check below, so a dedicated check would produce two issues for the same
 * root cause.
 */
const MIN_NODE_VERSION = '22.22.0';

export interface ProblemRecord {
  name: string;
  level: Extract<PrefixLogType, 'error' | 'warn'>;
  outputFn: () => void;
}

export async function doctorAction(options: DoctorCommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const problemRecord: ProblemRecord[] = [];

  // Check: Node.js version meets the minimum declared in package.json's
  // `engines.node` (>=22.22.0). Comparing only the major would falsely
  // green-light 22.0.0 - 22.21.x.
  const nodeVersion = process.versions.node;

  if (compareVersions(nodeVersion, MIN_NODE_VERSION) < 0) {
    problemRecord.push({
      level: 'error',
      name: 'unsupportedNodeVersion',
      outputFn: () => {
        Logger.log(
          `Node.js v${nodeVersion} detected, but HeroUI CLI requires Node.js ${MIN_NODE_VERSION} or later.`
        );
        Logger.log(`Current: v${nodeVersion}`);
        Logger.log(`Required: v${MIN_NODE_VERSION}+`);
        Logger.newLine();
        Logger.log('Upgrade Node.js: https://nodejs.org/');
      }
    });
  }

  // Check: HeroUI packages are installed. Recorded (rather than early-
  // returned) so any earlier problems (e.g. unsupportedNodeVersion) are
  // still reported in the same output pass.
  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    problemRecord.push({
      level: 'error',
      name: 'noHeroUIPackages',
      outputFn: () => {
        Logger.log(`No ${chalk.underline('HeroUI packages')} found in your project.`);
        Logger.newLine();
        Logger.log(
          `Consult the installation guide at: https://heroui.com/docs/react/getting-started/quick-start`
        );
      }
    });
  } else {
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
          Logger.log('Run `heroui install` to install them.');
        }
      });
    }

    // Check: peer dependencies are installed and meet minimum versions.
    // Tailwind CSS is one of these peer dependencies, so a missing/old
    // tailwind shows up here automatically — no separate check needed.
    const missingPeerDeps: string[] = [];
    const seen = new Set<string>();

    for (const pkg of installed) {
      const raw = await getCacheExecData(`npm show ${pkg} peerDependencies --json`);
      const peerDeps: Record<string, string> = raw ? JSON.parse(raw as SAFE_ANY) : {};

      for (const [peerPkg, peerVersion] of Object.entries(peerDeps)) {
        if (
          seen.has(peerPkg) ||
          HEROUI_PACKAGES.includes(peerPkg as (typeof HEROUI_PACKAGES)[number])
        )
          continue;
        seen.add(peerPkg);

        if (!allDependenciesKeys.has(peerPkg)) {
          missingPeerDeps.push(`${peerPkg} (${peerVersion})`);
        } else {
          const {currentVersion} = getVersionAndMode(allDependencies, peerPkg);
          const minVersion = transformPeerVersion(peerVersion);

          if (compareVersions(currentVersion, minVersion) < 0) {
            missingPeerDeps.push(`${peerPkg} (${peerVersion}, current: ${currentVersion})`);
          }
        }
      }
    }

    if (missingPeerDeps.length) {
      problemRecord.push({
        level: 'error',
        name: 'missingDependencies',
        outputFn: () => {
          Logger.log('You have not installed the required dependencies');
          Logger.newLine();
          Logger.log('The required dependencies are:');
          missingPeerDeps.forEach((dependency) => {
            Logger.log(`- ${dependency}`);
          });
          Logger.newLine();
          Logger.log(`See more info here: ${chalk.underline(DOCS_INSTALLED)}`);
        }
      });
    }
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
