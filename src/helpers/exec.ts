import {type CommonExecOptions, execSync} from 'node:child_process';

import {Logger} from './logger';

/**
 * Options for the exec function
 */
export interface ExecOptions extends CommonExecOptions {
  logCmd?: boolean;
}

/**
 * Execute a shell command, streaming its output to the terminal.
 * @param cmd - The command to execute
 * @param options - Execution options including logging preferences
 * @returns Promise resolving to the command output
 * @example
 * ```ts
 * await exec('npm install')
 * await exec('git status', { logCmd: false })
 * ```
 * @remarks
 * Output is inherited so package managers can render their own progress, which
 * means nothing is captured and there is nothing to cache here. Use
 * `getCacheExecData` from the cache module when you need the output.
 */
export async function exec(cmd: string, options?: ExecOptions): Promise<string> {
  const {logCmd = true, ...execOptions} = options || {};

  if (logCmd) {
    Logger.newLine();
    Logger.log(`${cmd}`);
  }

  const stdout = execSync(cmd, {
    stdio: 'inherit',
    ...execOptions
  });

  return stdout?.toString() ?? '';
}
