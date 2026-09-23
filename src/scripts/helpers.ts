import type {SAFE_ANY} from '@helpers/type';

import {exec} from 'node:child_process';

import chalk from 'chalk';
import {compareVersions as InternalCompareVersions, validate} from 'compare-versions';
import ora from 'ora';

import {getPackageVersion} from './cache/cache';

export type Dependencies = Record<string, string>;

/**
 * Compare two versions
 * @example compareVersions('1.0.0', '1.0.1') // -1
 * compareVersions('1.0.1', '1.0.0') // 1
 * compareVersions('1.0.0', '1.0.0') // 0
 * @param version1
 * @param version2
 */
export function compareVersions(version1 = '', version2 = '') {
  if (!validate(version1)) {
    return -1;
  }
  try {
    return InternalCompareVersions(version1, version2);
  } catch {
    return 0;
  }
}

export async function oraExecCmd(cmd: string, text?: string): Promise<SAFE_ANY> {
  text = text ?? `Executing ${cmd}`;

  const spinner = ora({
    discardStdin: false,
    spinner: {
      frames: [
        `⠋ ${chalk.gray(`${text}.`)}`,
        `⠙ ${chalk.gray(`${text}..`)}`,
        `⠹ ${chalk.gray(`${text}...`)}`,
        `⠸ ${chalk.gray(`${text}.`)}`,
        `⠼ ${chalk.gray(`${text}..`)}`,
        `⠴ ${chalk.gray(`${text}...`)}`,
        `⠦ ${chalk.gray(`${text}.`)}`,
        `⠧ ${chalk.gray(`${text}..`)}`,
        `⠇ ${chalk.gray(`${text}...`)}`,
        `⠏ ${chalk.gray(`${text}.`)}`
      ],
      interval: 150
    }
  });

  spinner.start();

  try {
    return await new Promise<SAFE_ANY>((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to execute \`${cmd}\`: ${stderr.trim() || error.message}`));

          return;
        }

        resolve(stdout.trim());
      });
    });
  } finally {
    spinner.stop();
  }
}

export async function getLatestVersion(packageName: string): Promise<string> {
  const result = await getPackageVersion(packageName);

  return result.version;
}

export const isGithubAction = process.env['CI'] === 'true';
