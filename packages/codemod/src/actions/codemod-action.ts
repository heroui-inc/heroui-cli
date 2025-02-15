import {Logger} from '@helpers/logger';

import {type Codemods, codemods} from '../types';

import {migrateAction} from './migrate-action';

function printUsage() {
  Logger.grey('Usage: ');
  Logger.log(`heroui [codemod]`);
  Logger.log(`heroui migrate [projectPath]`);
  Logger.newLine();
  Logger.grey('Codemods:');
  Logger.log(`- ${codemods.join('\n- ')}`);
}

export async function codemodAction(codemod: Codemods) {
  if (!codemod) {
    printUsage();

    process.exit(0);
  } else if (!codemods.includes(codemod)) {
    Logger.error(`Codemod "${codemod}" is invalid`);
    Logger.newLine();

    printUsage();
    process.exit(0);
  }

  migrateAction(['.'], {codemod});
}
