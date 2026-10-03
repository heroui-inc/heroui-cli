import {Logger} from '@helpers/logger';
import {outputInfo} from '@helpers/output-info';

export async function envAction() {
  try {
    await outputInfo();
  } catch (error) {
    Logger.prefix('error', `An error occurred while reading the environment: ${error}`);

    process.exit(1);
  }

  process.exit(0);
}
