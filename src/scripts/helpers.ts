import type {SAFE_ANY} from '@helpers/type';

import {exec} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import retry from 'async-retry';
import chalk from 'chalk';
import {compareVersions as InternalCompareVersions} from 'compare-versions';
import ora, {oraPromise} from 'ora';

import {Logger} from '@helpers/logger';
import {COMPONENTS_PATH} from 'src/constants/path';
import {getStore, getStoreSync, store} from 'src/constants/store';

import {getPackageVersion} from './cache/cache';

export type Dependencies = Record<string, string>;

export type Components = {
  name: string;
  package: string;
  version: string;
  docs: string;
  description: string;
  status: string;
  style: string;
  peerDependencies: Dependencies;
}[];

export type ComponentsJson = {
  version: string;
  components: Components;
  betaComponents: Components;
  betaVersion: string;
};

/**
 * Compare two versions
 * @example compareVersions('1.0.0', '1.0.1') // -1
 * compareVersions('1.0.1', '1.0.0') // 1
 * compareVersions('1.0.0', '1.0.0') // 0
 * @param version1
 * @param version2
 */
export function compareVersions(version1 = '', version2 = '') {
  try {
    return InternalCompareVersions(version1, version2);
  } catch {
    // Can't not support ('18 || 19.0.0-rc.0' received) temporary solution
    return 0;
  }
}

export async function updateComponents() {
  if (!existsSync(COMPONENTS_PATH)) {
    // First time download the latest date from net
    await autoUpdateComponents();

    return;
  }

  const components = JSON.parse(readFileSync(COMPONENTS_PATH, 'utf-8')) as ComponentsJson;
  const currentVersion = components.version;
  const betaVersion = components.betaVersion;
  const latestVersion = await getStore('latestVersion');
  const latestBetaVersion = await getStore('betaVersion');

  if (
    compareVersions(currentVersion, latestVersion) === -1 ||
    compareVersions(betaVersion, latestBetaVersion) === -1
  ) {
    // After the first time, check the version and update
    await autoUpdateComponents(latestVersion, latestBetaVersion);
  }
}

export async function getComponents() {
  let components: ComponentsJson = {} as ComponentsJson;

  await updateComponents();

  try {
    components = JSON.parse(readFileSync(COMPONENTS_PATH, 'utf-8')) as ComponentsJson;
  } catch (error) {
    new Error(`Get components.json error: ${error}`);
  }

  return components;
}

export async function oraExecCmd(cmd: string, text?: string): Promise<SAFE_ANY> {
  text = text ?? `Executing ${cmd}`;

  const spinner = ora({
    // Open ctrl + c cancel
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

  const result = await new Promise((resolve) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        Logger.error(`Exec cmd ${cmd} error`);
        process.exit(1);
      }
      resolve(stdout.trim());
    });
  });

  spinner.stop();

  return result;
}

export async function getLatestVersion(packageName: string): Promise<string> {
  if (store.heroUIComponentsPackageMap[packageName]) {
    return store.heroUIComponentsPackageMap[packageName]!.version;
  }

  const result = await getPackageVersion(packageName);

  return result.version;
}

const getUnpkgUrl = (version: string) =>
  `https://unpkg.com/@heroui/react@${version}/dist/components.json`;

export async function autoUpdateComponents(latestVersion?: string, betaVersion?: string) {
  [latestVersion, betaVersion] = await Promise.all([
    latestVersion || getStore('latestVersion'),
    betaVersion || getStore('betaVersion')
  ]);

  const url = getUnpkgUrl(latestVersion);

  const [components, betaComponents] = await Promise.all([
    downloadFile(url),
    getStoreSync('beta') ? downloadFile(getUnpkgUrl(betaVersion), false) : Promise.resolve([])
  ]);

  const filterMissingComponents = betaComponents.filter(
    (component) => !components.find((c) => c.name === component.name)
  );

  // Add missing beta components to components
  components.push(...filterMissingComponents);

  const componentsJson: ComponentsJson = {
    betaComponents,
    betaVersion,
    components,
    version: latestVersion
  };

  writeFileSync(COMPONENTS_PATH, JSON.stringify(componentsJson, null, 2), 'utf-8');

  return componentsJson;
}

export async function downloadFile(url: string, log = true): Promise<Components> {
  let data;

  await oraPromise(
    retry(
      async (bail) => {
        try {
          const result = await fetch(url, {
            body: null,
            headers: {
              'Content-Type': 'application/json',
              accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
            },
            method: 'GET',
            mode: 'cors'
          });

          data = JSON.parse(await result.text());
        } catch (error) {
          bail(error);
        }
      },
      {
        retries: 3
      }
    ),
    {
      failText(error) {
        log && Logger.prefix('error', `Update components data error: ${error}`);
        process.exit(1);
      },
      ...(log ? {successText: chalk.greenBright('Components data updated successfully!\n')} : {}),
      text: 'Fetching components data...'
    }
  );

  return data;
}

export const isGithubAction = process.env['CI'] === 'true';
