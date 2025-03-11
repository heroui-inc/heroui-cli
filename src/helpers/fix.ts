import type {CheckType} from './check';

import {execSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {pnpmRequired, tailwindRequired} from 'src/constants/required';
import {getStoreSync} from 'src/constants/store';

import {Logger} from './logger';
import {getMatchArray, replaceMatchArray} from './match';

interface FixTailwind {
  errorInfoList: string[];
  tailwindPath: string;
  write?: boolean;
  format?: boolean;
}

interface FixProvider {
  write?: boolean;
  format?: boolean;
}

export function fixProvider(appPath: string, options: FixProvider) {
  const {format = false, write = true} = options;
  let appContent = readFileSync(appPath, 'utf-8');

  appContent = `import {HeroUIProvider} from "@heroui/react";\n${appContent}`;

  appContent = wrapWithHeroUIProvider(appContent);

  write && writeFileSync(appPath, appContent, 'utf-8');
  format && execSync(`npx prettier --write ${appPath}`, {stdio: 'ignore'});
}

function wrapWithHeroUIProvider(content: string) {
  const returnRegex = /return\s*\(([\S\s]*?)\);/g;
  const wrappedCode = content.replace(returnRegex, (_, p1) => {
    return `return (
      <HeroUIProvider>
        ${p1.trim()}
      </HeroUIProvider>
    );`;
  });

  return wrappedCode;
}

export function fixTailwind(type: CheckType, options: FixTailwind) {
  const {errorInfoList, format = false, tailwindPath, write = true} = options;

  if (!errorInfoList.length) {
    return;
  }

  let tailwindContent = readFileSync(tailwindPath, 'utf-8');
  let contentMatch = getMatchArray('content', tailwindContent);
  const pluginsMatch = getMatchArray('plugins', tailwindContent);

  for (const errorInfo of errorInfoList) {
    const [errorType, info] = transformErrorInfo(errorInfo);

    if (errorType === 'content') {
      // Check if all the required content is added then skip
      const allPublic = contentMatch.includes(tailwindRequired.content);

      if (allPublic) continue;

      contentMatch = contentMatch.filter((content) => !content.includes('@heroui/theme/dist/'));
      contentMatch.push(info);
      tailwindContent = replaceMatchArray(
        'content',
        tailwindContent,
        contentMatch,
        contentMatch
          .map((v, index, arr) => {
            // Add 4 spaces before the content
            if (index === 0) {
              if (arr.length === 1) {
                return `\n    ${JSON.stringify(v)}\n`;
              }

              return `\n    ${JSON.stringify(v)}`;
            }
            if (arr.length - 1 === index) {
              return `    ${JSON.stringify(v)}\n  `;
            }

            return `    ${JSON.stringify(v)}`;
          })
          .join(',\n')
      );
    } else if (errorType === 'plugins') {
      pluginsMatch.push(info);
      tailwindContent = replaceMatchArray('plugins', tailwindContent, pluginsMatch);

      // Add import content
      const importContent = tailwindRequired.importContent(tailwindPath.endsWith('.ts'));

      tailwindContent = `${importContent}\n${tailwindContent}`;
    }

    if (type === 'all' && errorType === 'darkMode') {
      // Add darkMode under the plugins content in tailwindContent
      const darkModeIndex = tailwindContent.indexOf('plugins') - 1;
      const darkModeContent = tailwindRequired.darkMode;

      tailwindContent = `${tailwindContent.slice(
        0,
        darkModeIndex
      )} ${darkModeContent},\n${tailwindContent.slice(darkModeIndex)}`;
    }
  }

  write && writeFileSync(tailwindPath, tailwindContent, 'utf-8');

  if (format) {
    try {
      execSync(`npx prettier --write ${tailwindPath}`, {stdio: 'ignore'});
    } catch (error) {
      Logger.warn(`Prettier failed to format ${tailwindPath}`);
    }
  }
}

function transformErrorInfo(errorInfo: string): [keyof typeof tailwindRequired, string] {
  if (tailwindRequired.darkMode.includes(errorInfo)) {
    return ['darkMode', errorInfo];
  } else if (tailwindRequired.plugins.includes(errorInfo)) {
    return ['plugins', errorInfo];
  } else {
    return ['content', errorInfo];
  }
}

export function fixPnpm(
  npmrcPath: string,
  write = true,
  runInstall = true,
  logger: (({message, runInstall}) => void) | undefined = undefined
) {
  if (!existsSync(npmrcPath)) {
    write && writeFileSync(npmrcPath, pnpmRequired.content, 'utf-8');
  } else {
    let content = readFileSync(npmrcPath, 'utf-8');

    content = `${pnpmRequired.content}\n${content}`;

    write && writeFileSync(npmrcPath, content, 'utf-8');
  }

  if (!logger) {
    Logger.newLine();
    Logger.log(`Added the required content in file: ${npmrcPath}`);

    if (runInstall && !getStoreSync('debug')) {
      Logger.newLine();
      Logger.log('Pnpm restructure will be run now');
      execSync('pnpm install', {stdio: 'inherit'});
    }

    return;
  }

  // Custom logger
  logger({message: `Added the required content in file: ${npmrcPath}`, runInstall});
}
