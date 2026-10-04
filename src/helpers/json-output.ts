import type {CommandName} from './type';

import {store} from 'src/constants/store';

import {Logger} from './logger';
import {strip} from './utils';

export const JSON_OPTION_DESCRIPTION = 'Output the result as JSON';

const commandNames: readonly CommandName[] = [
  'agents-md',
  'doc',
  'doctor',
  'env',
  'info',
  'init',
  'install',
  'list',
  'uninstall',
  'upgrade'
];

export function isJsonMode(): boolean {
  return store.json || process.argv.includes('--json');
}

export function commandFromArgv(): CommandName | undefined {
  return process.argv.find((arg): arg is CommandName =>
    (commandNames as readonly string[]).includes(arg)
  );
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/**
 * `process.exit` is stubbed to throw in tests. That throw is not a command
 * failure, so callers that exit inside `try` must rethrow it.
 */
export function rethrowIfExit(error: unknown): void {
  if (error instanceof Error && error.name === 'ExitError') {
    throw error;
  }
}

/**
 * When `--json` is set, print one object and exit. Otherwise return so the
 * caller can keep the human-readable output.
 */
export function exitWithJson(payload: Record<string, unknown>, code?: number): void {
  if (!isJsonMode()) {
    return;
  }

  printJson(payload);
  process.exit(code ?? (payload['ok'] === false ? 1 : 0));
}

export function fail(command: CommandName | undefined, error: unknown, code = 1): never {
  const message = error instanceof Error ? error.message : String(error);

  if (isJsonMode()) {
    printJson({
      ...(command ? {command} : {}),
      error: strip(message),
      ok: false
    });
  } else {
    Logger.prefix('error', message);
  }

  process.exit(code);
}
