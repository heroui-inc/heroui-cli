/* eslint-disable @typescript-eslint/no-explicit-any */

import type {HeroUIComponentsMap, StoreKeys} from 'src/constants/store';
import type {Components} from 'src/scripts/helpers';

/**
 * @example 'test-test' => 'TestTest'
 */
export type PascalCase<T extends string> = T extends `${infer F}-${infer R}`
  ? `${Capitalize<F>}${PascalCase<R>}`
  : Capitalize<T>;

export type SAFE_ANY = any;

export type AppendKeyValue<T extends SAFE_ANY, K extends keyof any, V extends SAFE_ANY> = {
  [P in keyof T | K]?: P extends keyof T ? T[P] : P extends K ? V : never;
};

export type CommandName =
  | 'init'
  | 'list'
  | 'env'
  | 'upgrade'
  | 'remove'
  | 'add'
  | 'doctor'
  | 'remove';

/**
 * @example RequiredKey<{a?: 1, b?: 2}, a> => {a: 1, b?: 2}
 */
export type RequiredKey<T, Key extends keyof T> = {
  [K in keyof T as K extends Key ? never : K]?: T[K];
} & {
  [K in Key]-?: T[K];
};

/**
 * @example PartialKey<{a: 1, b: 2}, a> => {a?: 1, b: 2}
 */
export type PartialKey<T, Key extends keyof T> = {
  [K in keyof T as K extends Key ? never : K]: T[K];
} & {
  [K in Key]?: T[K];
};

export type ChalkColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey'
  | 'blackBright'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'magentaBright'
  | 'cyanBright'
  | 'whiteBright'
  | 'bgBlack'
  | 'bgRed'
  | 'bgGreen'
  | 'bgYellow'
  | 'bgBlue'
  | 'bgMagenta'
  | 'bgCyan'
  | 'bgWhite'
  | 'bgGray'
  | 'bgGrey'
  | 'bgBlackBright'
  | 'bgRedBright'
  | 'bgGreenBright'
  | 'bgYellowBright'
  | 'bgBlueBright'
  | 'bgMagentaBright'
  | 'bgCyanBright'
  | 'bgWhiteBright';

export type ExtractStoreData<T extends StoreKeys> = T extends 'latestVersion' | 'cliLatestVersion'
  ? string
  : T extends 'heroUIComponents'
    ? Components
    : T extends 'heroUIComponentsKeys' | 'heroUIcomponentsPackages'
      ? string[]
      : T extends 'heroUIComponentsKeysSet'
        ? Set<string>
        : T extends 'heroUIComponentsMap'
          ? HeroUIComponentsMap
          : T extends 'heroUIComponentsPackageMap'
            ? HeroUIComponentsMap
            : never;

/**
 *  @example UnionToIntersection<{ foo: string } | { bar: string }> --> { foo: string } & { bar: string }
 */
export type UnionToIntersection<U> = (U extends any ? (arg: U) => any : never) extends (
  arg: infer I
) => any
  ? I
  : never;

/**
 * @example GetUnionLastValue<0 | 1 | 2> --> 2
 */
export type GetUnionLastValue<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;
