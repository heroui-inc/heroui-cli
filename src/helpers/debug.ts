import {getStoreSync} from 'src/constants/store';

import {catchPnpmExec} from './actions/upgrade/catch-pnpm-exec';
import {exec} from './exec';
import {Logger} from './logger';

export async function debugExecAddAction(cmd: string, components: string[] = []) {
  if (getStoreSync('debug')) {
    for (const component of components) {
      Logger.warn(`Debug: ${component}`);
    }
  } else {
    await catchPnpmExec(() => exec(cmd));
  }
}
