import type {Agent} from './detect';
import type {HeroUIComponents} from 'src/constants/component';

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
    currentComponents: HeroUIComponents;
    isPnpm: boolean;
    prettier: boolean;
    isHeroUIAll: boolean;
  }
) {
  const {currentComponents, isHeroUIAll, isPnpm, prettier, tailwindPath} = options;

  if (tailwindPath && !existsSync(tailwindPath)) {
    Logger.prefix('warn', `No tailwind.config.(j|t)s found remove action skipped`);

    return;
  }

  let tailwindContent = readFileSync(tailwindPath!, 'utf-8');
  const contentMatch = getMatchArray('content', tailwindContent);
  const pluginsMatch = getMatchArray('plugins', tailwindContent);

  const insIncludeAll = contentMatch.some((c) => c.includes(tailwindRequired.content));

  // Not installed HeroUI components then remove the tailwind content about heroui
  if (!currentComponents.length && !isHeroUIAll) {
    const index = pluginsMatch.findIndex((c) => c.includes('heroui'));

    index !== -1 && pluginsMatch.splice(index, 1);
    tailwindContent = replaceMatchArray('plugins', tailwindContent, pluginsMatch);

    // Remove the import heroui content
    tailwindContent = tailwindContent.replace(/(const|var|let|import)[\W\w]+?heroui.*?;\n/, '');
  }

  // If there are already have all heroui content include then don't need to remove the content
  if (!insIncludeAll) {
    // Remove the heroui content
    while (contentMatch.some((c) => c.includes('heroui'))) {
      contentMatch.splice(
        contentMatch.findIndex((c) => c.includes('heroui')),
        1
      );
    }
    tailwindContent = replaceMatchArray('content', tailwindContent, contentMatch);
  }
  //  if (!currentComponents.length && isHeroUIAll) {
  //   const index = contentMatch.findIndex(c => c.includes('heroui'));

  //   // Remove the heroui content
  //   index !== -1 &&
  //     contentMatch.splice(
  //       contentMatch.indexOf('./node_modules/@heroui/theme/dist/components'),
  //       1
  //     );
  //   tailwindContent = replaceMatchArray('content', tailwindContent, contentMatch);
  // } else if (!isHeroUIAll && currentComponents.length) {
  //   const index = contentMatch.indexOf(tailwindRequired.content);

  //   // Remove the heroui content
  //   index !== -1 && contentMatch.splice(index, 1);
  //   tailwindContent = replaceMatchArray('content', tailwindContent, contentMatch);
  // }
  // Write the tailwind content
  writeFileSync(tailwindPath!, tailwindContent, 'utf-8');

  const [, ...errorInfoList] = checkTailwind(
    type as 'partial',
    tailwindPath!,
    currentComponents,
    isPnpm,
    undefined,
    true
  );

  fixTailwind(type, {errorInfoList, format: prettier, tailwindPath: tailwindPath!});

  Logger.newLine();
  Logger.info(`Remove the removed components tailwind content in file: ${tailwindPath}`);
}
