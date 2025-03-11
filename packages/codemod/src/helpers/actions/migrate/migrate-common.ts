import type {StoreObject} from '../../store';

import jscodeshift from 'jscodeshift';

/**
 * Migrate the name of the import
 * @example
 * migrateImportName(parsedContent, 'nextui', 'heroui');
 * import {nextui} from 'xxx'; -> import {heroui} from 'xxx';
 * import nextui from 'xxx'; -> import heroui from 'xxx';
 * const {nextui} = require('xxx'); -> const {heroui} = require('xxx');
 * const nextui = require('xxx'); -> const heroui = require('xxx');
 */
export function migrateImportName(
  parsedContent: StoreObject['parsedContent'],
  match: string,
  replace: string
) {
  let dirtyFlag = false;

  parsedContent?.find(jscodeshift.ImportDeclaration).forEach((path) => {
    path.node.specifiers?.forEach((specifier) => {
      // ImportSpecifier
      if (jscodeshift.ImportSpecifier.check(specifier) && specifier.imported.name === match) {
        specifier.imported.name = replace;
        dirtyFlag = true;
      }
      if (jscodeshift.ImportDefaultSpecifier.check(specifier) && specifier.local?.name === match) {
        specifier.local.name = replace;
        dirtyFlag = true;
      }
    });
  });

  // Handle require statements
  if (!dirtyFlag) {
    parsedContent?.find(jscodeshift.VariableDeclaration).forEach((path) => {
      path.node.declarations.forEach((declaration) => {
        if (
          jscodeshift.VariableDeclarator.check(declaration) &&
          jscodeshift.CallExpression.check(declaration.init) &&
          jscodeshift.Identifier.check(declaration.init.callee) &&
          declaration.init.callee.name === 'require'
        ) {
          // Handle: const nextui = require('...')
          if (jscodeshift.Identifier.check(declaration.id) && declaration.id.name === match) {
            declaration.id.name = replace;
            dirtyFlag = true;
          }

          // Handle: const { nextui } = require('...')
          if (jscodeshift.ObjectPattern.check(declaration.id)) {
            declaration.id.properties.forEach((property) => {
              if (
                jscodeshift.ObjectProperty.check(property) &&
                jscodeshift.Identifier.check(property.key) &&
                property.key.name === match
              ) {
                property.key.name = replace;
                if (jscodeshift.Identifier.check(property.value)) {
                  property.value.name = replace;
                }
                dirtyFlag = true;
              }
            });
          }
        }
      });
    });
  }

  return dirtyFlag;
}

/**
 * Migrate the name of the JSX element
 * @example
 * migrateJSXElementName(parsedContent, 'NextUIProvider', 'HeroUIProvider');
 * <NextUIProvider /> -> <HeroUIProvider />
 */
export function migrateJSXElementName(
  parsedContent: StoreObject['parsedContent'],
  match: string,
  replace: string
) {
  let dirtyFlag = false;

  parsedContent
    ?.find(jscodeshift.JSXElement, {
      openingElement: {name: {name: match}}
    })
    .forEach((path) => {
      (path.node.openingElement.name as jscodeshift.JSXIdentifier).name = replace;
      if (path.node.closingElement) {
        (path.node.closingElement.name as jscodeshift.JSXIdentifier).name = replace;
      }
      dirtyFlag = true;
    });

  return dirtyFlag;
}

export function migrateByRegex(rawContent: string, match: string, replace: string) {
  const regex = new RegExp(match, 'g');
  const dirtyFlag = regex.test(rawContent);

  if (dirtyFlag) {
    rawContent = rawContent.replace(regex, replace);
  }

  return {
    dirtyFlag,
    rawContent
  };
}

/**
 * Migrate the name of the CallExpression
 * @example
 * migrateCallExpressionName(parsedContent, 'nextui', 'heroui');
 * nextui() -> heroui()
 */
export function migrateCallExpressionName(
  parsedContent: StoreObject['parsedContent'],
  match: string,
  replace: string
) {
  let dirtyFlag = false;

  // Replace `nextui` with `heroui` in the plugins array
  parsedContent?.find(jscodeshift.CallExpression, {callee: {name: match}}).forEach((path) => {
    path.get('callee').replace(jscodeshift.identifier(replace));
    dirtyFlag = true;
  });

  return dirtyFlag;
}
