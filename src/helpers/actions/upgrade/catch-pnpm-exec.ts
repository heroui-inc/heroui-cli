import chalk from 'chalk';

import {exec} from '@helpers/exec';
import {selectClack} from 'src/prompts/clack';

export async function catchPnpmExec(execFn: () => Promise<unknown>) {
  try {
    await execFn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error) {
      const reRunPnpm = await selectClack({
        message: `${chalk.red('Error: ')}a unexpected error occurred, run "pnpm install" maybe can fix it or report it as a bug`,
        options: [
          {label: 'Re-run pnpm install', value: 're-run-pnpm-install'},
          {label: 'Exit', value: 'exit'}
        ]
      });

      if (reRunPnpm === 'exit') {
        process.exit(1);
      }

      await exec('pnpm install --force');
      await execFn();
    }
  }
}
