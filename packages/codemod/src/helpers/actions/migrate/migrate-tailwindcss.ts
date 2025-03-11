import type {SAFE_ANY} from '@helpers/type';

import jscodeshift from 'jscodeshift';

import {
  HEROUI_PLUGIN,
  HEROUI_PREFIX,
  NEXTUI_PLUGIN,
  NEXTUI_PREFIX
} from '../../../constants/prefix';
import {getStore, updateAffectedFiles, writeFileAndUpdateStore} from '../../store';

import {migrateCallExpressionName, migrateImportName} from './migrate-common';
import {migrateImportPackage} from './migrate-import';

export function migrateTailwindcss(paths: string[]) {
  for (const path of paths) {
    // Migrate nextui plugin import/require
    const parsedContent = getStore(path, 'parsedContent');

    if (!parsedContent) {
      continue;
    }
    let dirtyFlag = false;

    // Migrate const {nextui} = require("xxx") --> const {heroui} = require("xxx")
    dirtyFlag = migrateImportName(parsedContent, NEXTUI_PLUGIN, HEROUI_PLUGIN);

    // Migrate const {xxx} = require("nextui") --> const {xxx} = require("heroui") -- (optional avoid user skip the "import-heroui" codemod)
    dirtyFlag = migrateImportPackage(parsedContent);

    // Migrate plugin call expression nextui() -> heroui()
    dirtyFlag = migrateCallExpressionName(parsedContent, NEXTUI_PLUGIN, HEROUI_PLUGIN);

    // Migrate the content path from `@nextui-org/theme` to `@heroui/theme`
    parsedContent.find(jscodeshift.ObjectExpression).forEach((path) => {
      path.node.properties.forEach((prop: SAFE_ANY) => {
        if (
          jscodeshift.Identifier.check(prop.key) &&
          prop.key.name === 'content' &&
          jscodeshift.ArrayExpression.check(prop.value)
        ) {
          prop.value.elements.forEach((element) => {
            if (
              jscodeshift.Literal.check(element) &&
              typeof element.value === 'string' &&
              element.value.includes(NEXTUI_PREFIX)
            ) {
              element.value = element.value.replace(NEXTUI_PREFIX, HEROUI_PREFIX);
              dirtyFlag = true;
            }
          });
        }
      });
    });

    if (dirtyFlag) {
      writeFileAndUpdateStore(path, 'parsedContent', parsedContent);
      updateAffectedFiles(path);
    }
  }
}
