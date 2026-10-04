import {exitWithJson, fail, isJsonMode, rethrowIfExit} from '@helpers/json-output';
import {collectEnvironment, outputInfo} from '@helpers/output-info';

export async function envAction() {
  try {
    if (isJsonMode()) {
      exitWithJson({command: 'env', environment: await collectEnvironment(), ok: true}, 0);
    } else {
      await outputInfo();
    }
  } catch (error) {
    rethrowIfExit(error);
    fail('env', `An error occurred while reading the environment: ${error}`);
  }

  process.exit(0);
}
