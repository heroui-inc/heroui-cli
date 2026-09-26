import type {SAFE_ANY} from '@helpers/type';

import {Logger} from '@helpers/logger';
import {type Command} from 'commander';

import {DEBUG} from './helpers/debug';
import {initOptions} from './helpers/options';

export async function runCodemodPreAction(command: Command | {rawArgs?: string[]}): Promise<void> {
  const options = ((command as SAFE_ANY).rawArgs ?? []).slice(2);
  const debug = options.includes('--debug') || options.includes('-d');
  const format = options.includes('--format') || options.includes('-f');

  initOptions({format});

  DEBUG.enabled = debug;
}

export async function handleCodemodParseError(reason: unknown): Promise<void> {
  Logger.newLine();
  Logger.error('Unexpected error. Please report it as a bug:');
  Logger.log(reason);
  Logger.newLine();
  process.exit(1);
}
