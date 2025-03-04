import fs from 'node:fs';
import {join} from 'node:path';

import * as p from '@clack/prompts';
import chalk from 'chalk';
import {resolve} from 'pathe';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {confirmClack, getDirectoryClack} from 'src/prompts/clack';

import {getBaseStorageUrl} from './get-base-storage-url';
import {getCodeBaseFiles} from './get-codebase-files';
import {fetchAllRelatedFiles} from './get-related-imports';
import {writeFilesWithMkdir} from './write-files';

export interface AddActionOptions {
  all?: boolean;
  prettier?: boolean;
  packagePath?: string;
  tailwindPath?: string;
  appPath?: string;
  addApp?: boolean;
  beta?: boolean;
  directory: string;
}

const httpRegex = /^https?:\/\//;
const APP_FILE = 'App.tsx';

export function isAddingHeroChatCodebase(targets: string[]) {
  return targets.some((target) => httpRegex.test(target));
}

export async function addHeroChatCodebase(targets: string[], options: AddActionOptions) {
  p.intro(chalk.cyan('Starting to add Hero Chat codebase'));

  const directory = resolve(process.cwd(), options.directory ?? (await getDirectoryClack()));
  const {baseStorageUrl, chatTitle, codeSandboxId, token} = await getBaseStorageUrl(targets[0]!);
  const chatTitleFile = chatTitle ? `${chatTitle}.tsx` : undefined;

  const ifExists = fs.existsSync(directory);

  if (!ifExists) {
    Logger.error(`Directory ${directory} does not exist`);
    process.exit(1);
  }

  /** ======================== Add files ======================== */
  const filePath = `${baseStorageUrl}/retrieve?codeSandboxId=${codeSandboxId}`;
  const codeFiles = await getCodeBaseFiles(filePath, token);
  const appFile = codeFiles.find((file) => file.name.includes(APP_FILE));
  const pkgContent = codeFiles.find((file) => file.name.includes('package.json'))?.content;

  if (appFile) {
    const relatedFiles = await fetchAllRelatedFiles({
      content: appFile.content,
      filePath: 'src/App.tsx'
    });

    for (const relatedFile of relatedFiles) {
      if (relatedFile.fileName.includes(APP_FILE)) {
        writeFilesWithMkdir(directory, `${chatTitleFile || APP_FILE}`, relatedFile.fileContent);
        continue;
      }

      writeFilesWithMkdir(
        directory,
        `${relatedFile.filePath.replace('src/', '')}`,
        relatedFile.fileContent
      );
    }
  }

  /** ======================== Check if the project missing dependencies ======================== */
  if (pkgContent) {
    const pkgContentJson = JSON.parse(pkgContent);
    const {allDependenciesKeys} = getPackageInfo(join(process.cwd(), 'package.json'));
    const missingDependencies = Object.keys(pkgContentJson.dependencies).filter(
      (key) => !allDependenciesKeys.has(key)
    );

    if (missingDependencies.length > 0) {
      p.log.warn(
        `The project is missing the following dependencies to run the codebase: ${missingDependencies.join(', ')}`
      );

      const isAddMissingDependencies = await confirmClack({
        message: 'Do you want to add the missing dependencies?'
      });

      const currentPkgManager = await detect();
      const runCmd = currentPkgManager === 'npm' ? 'install' : 'add';
      const installCmd = `${currentPkgManager} ${runCmd} ${missingDependencies.map((target) => `${target}@${pkgContentJson.dependencies[target]}`).join(' ')}`;

      if (isAddMissingDependencies) {
        try {
          await exec(installCmd);
        } catch {
          p.log.error(
            `Failed to install dependencies. Please add ${missingDependencies.join(' ')} manually.`
          );
        }
      } else {
        p.note(`Run \`${installCmd}\` to start!`, 'Next steps');
      }
    }
  }

  p.outro(chalk.green('✅ Hero Chat codebase added successfully!'));
}

/** ======================== For the future init project ======================== */
// else {
//   for (let file of filesToAdd) {
//     const filePath = `${url}/${file}`;
//     const response = await fetchRequest(filePath);

//     let fileContent = await response.text();

//     if (chatTitleFile) {
//       // Update App.tsx to chatTitle
//       if (file.includes(APP_FILE)) {
//         file = file.replace(APP_FILE, chatTitleFile);
//       }
//       // Update main.tsx import
//       if (file.includes('main.tsx')) {
//         fileContent = fileContent.replace(/from '.\/App\.tsx'/, `from './${chatTitleFile}'`);
//         fileContent = fileContent.replace(/from '.\/App'/, `from './${chatTitle}'`);
//       }
//     }

//     writeFilesWithMkdir(directory, file, fileContent);
//   }
// }

/** ======================== Add templates ======================== */
// for (const [file, value] of Object.entries(templates)) {
//   writeFilesWithMkdir(directory, file, value.content);
// }

// const isInstall = await confirmClack({
//   message: 'Do you want to install the dependencies?'
// });

// if (isInstall) {
//   const packageManager = await detect();
//   const installCmd =
//     packageManager === 'pnpm' ? 'pnpm install --shamefully-hoist' : `${packageManager} install`;

//   try {
//     await exec(`cd ${directory} && ${installCmd} && npm run dev`);
//   } catch {
//     p.log.error(`Failed to install dependencies. Please run "${installCmd}" manually.`);
//   }
// } else {
//   p.note(`Cd to ${directory}\nRun \`pnpm install\` to start!`, 'Next steps');
// }
