import type {SAFE_ANY} from '@helpers/type';

import {Logger} from '@helpers/logger';
import jscodeshift, {type Collection} from 'jscodeshift';
import babylonParse from 'jscodeshift/parser/babylon';
import tsOptions from 'jscodeshift/parser/tsOptions';

import {DEBUG} from './debug';
import {getStore} from './store';

const dtsOptions = {
  ...tsOptions,
  plugins: [
    ...tsOptions.plugins.filter((plugin) => plugin !== 'typescript'),
    ['typescript', {dts: true}]
  ]
};

function createParserFromPath(filePath: string): jscodeshift.JSCodeshift {
  const isDeclarationFile = /\.d\.(m|c)?ts$/.test(filePath);

  if (isDeclarationFile) {
    return jscodeshift.withParser(babylonParse(dtsOptions));
  }

  // jsx is allowed in .js files, feed them into the tsx parser.
  // tsx parser :.js, .jsx, .tsx
  // ts parser: .ts, .mts, .cts
  const isTsFile = /\.(m|c)?.ts$/.test(filePath);

  return isTsFile ? jscodeshift.withParser('ts') : jscodeshift.withParser('tsx');
}

export function parseContent(path: string): Collection<SAFE_ANY> | undefined {
  // skip json files
  if (path.endsWith('.json')) {
    return;
  }
  const content = getStore(path, 'rawContent');

  try {
    const parser = createParserFromPath(path);
    const jscodeShift = parser(content);

    return jscodeShift;
  } catch (error) {
    DEBUG.enabled && Logger.warn(`Parse ${path} content failed, skip it: ${error}`);

    return;
  }
}

export function safeParseJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}
