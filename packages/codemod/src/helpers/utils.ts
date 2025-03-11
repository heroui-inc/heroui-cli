import type {Codemods} from '../types';

import {detect} from '@helpers/detect';

import {NEXTUI_PREFIX} from '../constants/prefix';

import {getStore} from './store';

export function getCanRunCodemod(codemod: Codemods, targetName: Codemods) {
  return codemod === undefined || codemod === targetName;
}

export function filterNextuiFiles(files: string[]) {
  return files.filter((file) => new RegExp(NEXTUI_PREFIX, 'g').test(getStore(file, 'rawContent')));
}

export async function getInstallCommand() {
  const packageManager = await detect();

  return {
    cmd: `${packageManager} install`,
    packageManager
  };
}
