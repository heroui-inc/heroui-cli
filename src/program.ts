import type {CommandName, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';

import {CLIError} from '@helpers/errors';
import {isJsonMode, printJson} from '@helpers/json-output';
import {Logger, gradientString} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';
import {outputBox} from '@helpers/output-info';
import {getAnalytics, shutdown} from 'src/analytics';
import {getStore, store} from 'src/constants/store';
import {initCache} from 'src/scripts/cache/cache';
import {compareVersions} from 'src/scripts/helpers';

import pkg from '../package.json';

const commandList: CommandName[] = [
  'install',
  'agents-md',
  'env',
  'init',
  'list',
  'info',
  'doc',
  'upgrade',
  'doctor',
  'uninstall'
];

/**
 * Root command action: print a suggestion for an unknown command, otherwise help.
 */
export async function runDefaultAction(
  program: {helpInformation: () => string},
  command?: {args?: string[]}
): Promise<void> {
  let isArgs = false;

  if (command) {
    const args = command.args?.[0];

    if (args && !commandList.includes(args as CommandName)) {
      isArgs = true;

      const matchCommand = findMostMatchText(commandList, args);

      if (matchCommand) {
        Logger.error(`Unknown command '${args}', Did you mean '${chalk.underline(matchCommand)}'?`);
      } else {
        Logger.error(`Unknown command '${args}'`);
      }
    }
  }

  if (!isArgs) {
    const helpInfo = program.helpInformation();

    let helpInfoArr = helpInfo.split('\n');

    helpInfoArr = helpInfoArr.filter((info) => info && !info.includes('HeroUI CLI v'));
    helpInfoArr = helpInfoArr.map((info) => {
      const commandName = info.match(/(\w+)\s\[/)?.[1];

      if (commandName) {
        return info.replace(commandName, chalk.cyan(commandName));
      }

      return info;
    });

    Logger.log(helpInfoArr.join('\n'));
  }
  process.exit(isArgs ? 1 : 0);
}

/**
 * Prepare cache, debug, and the upgrade notice before a subcommand runs.
 */
export async function runPreAction(command: {args?: string[]; rawArgs?: string[]}): Promise<void> {
  const commandName = command.args?.[0];
  const options = ((command as SAFE_ANY).rawArgs ?? []).slice(2);
  const noCache = options.includes('--no-cache');
  const debug = options.includes('--debug') || options.includes('-d');
  const json = options.includes('--json');

  if (!commandName) {
    return;
  }

  initCache(noCache);
  store.debug = debug;
  store.json = json;

  let cliLatestVersion = '';

  try {
    cliLatestVersion = await getStore('cliLatestVersion');
  } catch {
    return;
  }

  store.cliLatestVersion = cliLatestVersion;

  const currentVersion = pkg.version;

  if (!store.json && compareVersions(currentVersion, cliLatestVersion) === -1) {
    outputBox({
      center: true,
      color: 'yellow',
      padding: 1,
      text: `${chalk.gray(
        `Available upgrade: v${currentVersion} -> ${chalk.greenBright(
          `v${cliLatestVersion}`
        )}\nRun \`${chalk.cyan(
          'npm install -g heroui-cli@latest'
        )}\` to upgrade\nChangelog: ${chalk.underline(
          'https://github.com/heroui-inc/heroui-cli/releases'
        )}`
      )}`,
      title: gradientString('HeroUI CLI')
    });
    Logger.newLine();
  }
}

function exitFatalJson(error: string): void {
  if (!isJsonMode()) {
    return;
  }

  printJson({error, ok: false});
  process.exit(1);
}

export function handleUnhandledRejection(reason: unknown): void {
  const message = reason instanceof Error ? reason.message : String(reason);

  exitFatalJson(`Unhandled promise rejection: ${message}`);
  Logger.newLine();
  Logger.error('Unhandled promise rejection:');
  Logger.log(message);
  process.exit(1);
}

export function handleUncaughtException(error: Error): void {
  exitFatalJson(`Uncaught exception: ${error.message}`);
  Logger.newLine();
  Logger.error('Uncaught exception:');
  Logger.log(error.message);
  process.exit(1);
}

function isCommanderUsageError(error: Error): boolean {
  const code = (error as {code?: unknown}).code;

  return typeof code === 'string' && code.startsWith('commander.');
}

export async function handleParseError(error: Error): Promise<void> {
  if (error instanceof CLIError || isCommanderUsageError(error)) {
    exitFatalJson(error.message);
    Logger.newLine();
    Logger.error(error.message);
    Logger.newLine();
    process.exit(1);
  }

  const isAgentsMd = process.argv.includes('agents-md');

  if (isAgentsMd) {
    const analytics = getAnalytics();

    analytics?.trackError({
      error,
      errorEvent: 'AGENTS_MD_ERROR',
      fallbackMessage: 'Unexpected error in agents-md',
      properties: {}
    });
    await shutdown();
  }

  exitFatalJson(`Unexpected error. Please report it as a bug: ${error.message}`);
  Logger.newLine();
  Logger.error('Unexpected error. Please report it as a bug:');
  Logger.log(error.message);
  if (error.stack) {
    Logger.grey(error.stack);
  }
  Logger.newLine();
  process.exit(1);
}
