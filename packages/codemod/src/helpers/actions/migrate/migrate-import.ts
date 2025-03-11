import jscodeshift from 'jscodeshift';

import {HEROUI_PREFIX, NEXTUI_PREFIX} from '../../../constants/prefix';
import {
  type StoreObject,
  getStore,
  updateAffectedFiles,
  writeFileAndUpdateStore
} from '../../store';

/**
 * Migrate the import package will directly write the file
 * @example
 * migrateImportPackage(['xxx']);
 * import {xxx} from '@nextui-org/theme'; -> import {xxx} from '@heroui/theme';
 * const {xxx} = require('@nextui-org/theme'); -> const {xxx} = require('@heroui/theme');
 */
export function migrateImportPackageWithPaths(paths: string[]) {
  for (const path of paths) {
    const parsedContent = getStore(path, 'parsedContent');

    if (!parsedContent) {
      continue;
    }

    try {
      const dirtyFlag = migrateImportPackage(parsedContent);

      if (dirtyFlag) {
        // Write the modified content back to the file
        writeFileAndUpdateStore(path, 'parsedContent', parsedContent);
        updateAffectedFiles(path);
      }
      // eslint-disable-next-line no-empty
    } catch {}
  }
}

export function migrateImportPackage(parsedContent: NonNullable<StoreObject['parsedContent']>) {
  let dirtyFlag = false;

  // Find the import declaration for '@nextui-org/' start
  parsedContent.find(jscodeshift.ImportDeclaration).forEach((path) => {
    const importValue = path.node.source.value;

    if (importValue && importValue.toString().includes(NEXTUI_PREFIX)) {
      path.node.source.value = importValue.toString().replaceAll(NEXTUI_PREFIX, HEROUI_PREFIX);
      dirtyFlag = true;
    }
  });
  // Find the require declaration for '@nextui-org/' start, when the import declaration is not found
  if (!dirtyFlag) {
    parsedContent
      .find(jscodeshift.CallExpression, {
        callee: {
          name: 'require',
          type: 'Identifier'
        }
      })
      .forEach((path) => {
        const requireArg = path.node.arguments[0];

        if (
          requireArg &&
          requireArg.type === 'StringLiteral' &&
          requireArg.value.includes(NEXTUI_PREFIX)
        ) {
          requireArg.value = requireArg.value.replaceAll(NEXTUI_PREFIX, HEROUI_PREFIX);
          dirtyFlag = true;
        }
      });
  }

  return dirtyFlag;
}
