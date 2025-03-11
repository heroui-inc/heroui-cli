import type {SAFE_ANY} from '@helpers/type';

import {Logger} from '@helpers/logger';

import {HEROUI_PREFIX, NEXTUI_PREFIX} from '../../../constants/prefix';
import {fetchPackageLatestVersion} from '../../https';
import {safeParseJson} from '../../parse';
import {getStore, updateAffectedFiles, writeFileAndUpdateStore} from '../../store';

const DEFAULT_INDENT = 2;
const LATEST_VERSION = 'latest';

export function detectIndent(content: string): number {
  const match = content.match(/^(\s+)/m);

  return match ? match[1]?.length || DEFAULT_INDENT : DEFAULT_INDENT;
}

function filterHeroUiPkgs(pkgs: string[]) {
  return pkgs.filter((pkg) => pkg.includes(HEROUI_PREFIX) || pkg.includes(NEXTUI_PREFIX));
}

export async function migrateJson(files: string[]) {
  try {
    await Promise.all(
      files.map(async (file) => {
        const content = getStore(file, 'rawContent');
        const dirtyFlag = content.includes(NEXTUI_PREFIX);

        if (dirtyFlag) {
          const replacedContent = content.replaceAll(NEXTUI_PREFIX, HEROUI_PREFIX);
          const json = safeParseJson(replacedContent);

          try {
            await Promise.all([
              ...filterHeroUiPkgs(Object.keys(json.dependencies)).map(async (key) => {
                try {
                  const version = await fetchPackageLatestVersion(key);

                  json.dependencies[key] = version;
                } catch (error) {
                  json.dependencies[key] = LATEST_VERSION;
                }
              }),
              ...filterHeroUiPkgs(Object.keys(json.devDependencies)).map(async (key) => {
                try {
                  const version = await fetchPackageLatestVersion(key);

                  json.devDependencies[key] = version;
                } catch (error) {
                  json.devDependencies[key] = LATEST_VERSION;
                }
              })
            ]);
          } catch (error) {
            Logger.warn(
              `Migrate ${file} failed\n${error}\nYou need to manually migrate the rest of the packages.`
            );
          }
          const indent = detectIndent(content);

          writeFileAndUpdateStore(file, 'rawContent', JSON.stringify(json, null, indent));
          updateAffectedFiles(file);
        }
      })
    );
  } catch (error) {
    Logger.error(`Migrate package.json failed: ${error}`);
    process.exit(1);
  }
}

export function migrateNextuiToHeroui(json: Record<string, SAFE_ANY>) {
  const {dependencies, devDependencies} = json;

  if (dependencies) {
    Object.keys(dependencies).forEach((key) => {
      if (key.includes(NEXTUI_PREFIX)) {
        dependencies[key.replace(NEXTUI_PREFIX, HEROUI_PREFIX)] = dependencies[key];
        delete dependencies[key];
      }
    });
  }

  if (devDependencies) {
    Object.keys(devDependencies).forEach((key) => {
      if (key.includes(NEXTUI_PREFIX)) {
        devDependencies[key.replace(NEXTUI_PREFIX, HEROUI_PREFIX)] = devDependencies[key];
        delete devDependencies[key];
      }
    });
  }
}
