import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo} from '@helpers/package';
import {store} from 'src/constants/store';

import {type HeroUIComponents} from '../../src/constants/component';
import {resolver} from '../../src/constants/path';

interface ListActionOptions {
  remote?: boolean;
  packagePath?: string;
}

export async function listAction(options: ListActionOptions) {
  const {packagePath = resolver('package.json'), remote = false} = options;

  let components = store.heroUIComponents as HeroUIComponents;

  try {
    /** ======================== Get the installed components ======================== */
    if (!remote) {
      const {currentComponents} = await getPackageInfo(packagePath);

      components = currentComponents;
    }

    if (!components.length) {
      Logger.warn(`No HeroUI components detected in the specified package.json at: ${packagePath}`);

      return;
    }

    /** ======================== Output the components ======================== */
    remote ? outputComponents({commandName: 'list', components}) : outputComponents({components});
  } catch (error) {
    Logger.prefix('error', `An error occurred while attempting to list the components: ${error}`);
  }

  process.exit(0);
}
