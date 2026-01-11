import {type CommonExecOptions, execSync} from 'node:child_process';

import {Logger} from './logger';

const execCache = new Map<string, string>();

/**
 * Options for the exec function
 */
export interface ExecOptions extends CommonExecOptions {
  logCmd?: boolean;
  cache?: boolean;
}

/**
 * Execute a shell command with optional caching and logging.
 * @param cmd - The command to execute
 * @param options - Execution options including caching and logging preferences
 * @returns Promise resolving to the command output
 * @example
 * ```ts
 * await exec('npm install')
 * await exec('git status', { logCmd: false })
 * await exec('npm view react version', { cache: true })
 * ```
 * @remarks Prefer using `getCacheExecData` from cache module for persistent caching
 */
export async function exec(cmd: string, options?: ExecOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const {cache = true, logCmd = true, ...execOptions} = options || {};

      if (execCache.has(cmd) && cache) {
        const cached = execCache.get(cmd);

        if (cached) {
          resolve(cached);

          return;
        }
      }

      if (logCmd) {
        Logger.newLine();
        Logger.log(`${cmd}`);
      }

      const stdout = execSync(cmd, {
        stdio: 'inherit',
        ...execOptions
      });

      if (stdout) {
        const output = stdout.toString();

        execCache.set(cmd, output);
        resolve(output);

        return;
      }

      resolve('');
    } catch (error) {
      reject(error);
    }
  });
}
