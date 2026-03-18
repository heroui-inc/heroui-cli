import type {Agent} from './detect';
import type {PackageComponent} from './package';

import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {tailwindRequired} from 'src/constants/required';

import {type CheckType, checkTailwind} from './check';
import {exec} from './exec';
import {fixTailwind} from './fix';
import {Logger} from './logger';
import {getMatchArray, replaceMatchArray} from './match';
import {getPackageManagerInfo} from './utils';

export async function removeDependencies(components: string[], packageManager: Agent) {
  const {remove} = getPackageManagerInfo(packageManager);

  await exec(`${packageManager} ${remove} ${components.join(' ')}`);

  return;
}

export async function removeTailwind(
  type: CheckType,
  options: {
    tailwindPath?: string;
    currentComponents: PackageComponent[];
    isPnpm: boolean;
    prettier: boolean;
    isHeroUIAll: boolean;
  }
) {
  const {currentComponents, isHeroUIAll, prettier, tailwindPath} = options;

  if (tailwindPath && !existsSync(tailwindPath)) {
    Logger.prefix('warn', `No tailwind.config.(j|t)s found remove action skipped`);

    return;
  }

  let tailwindContent = readFileSync(tailwindPath!, 'utf-8');
  const contentMatch = getMatchArray('content', tailwindContent);
  const pluginsMatch = getMatchArray('plugins', tailwindContent);

  const insIncludeAll = contentMatch.some((c) => c.includes(tailwindRequired.content));

  if (!currentComponents.length && !isHeroUIAll) {
    const index = pluginsMatch.findIndex((c) => c.includes('heroui'));

    index !== -1 && pluginsMatch.splice(index, 1);
    tailwindContent = replaceMatchArray('plugins', tailwindContent, pluginsMatch);

    tailwindContent = tailwindContent.replace(/(const|var|let|import)[\W\w]+?heroui.*?;\n/, '');
  }

  if (!insIncludeAll) {
    while (contentMatch.some((c) => c.includes('heroui'))) {
      contentMatch.splice(
        contentMatch.findIndex((c) => c.includes('heroui')),
        1
      );
    }
    tailwindContent = replaceMatchArray('content', tailwindContent, contentMatch);
  }

  writeFileSync(tailwindPath!, tailwindContent, 'utf-8');

  const [, ...errorInfoList] = checkTailwind(type, tailwindPath!);

  fixTailwind(type, {errorInfoList, format: prettier, tailwindPath: tailwindPath!});

  Logger.newLine();
  Logger.info(`Remove the removed components tailwind content in file: ${tailwindPath}`);
}
