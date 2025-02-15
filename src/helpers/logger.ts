/* eslint-disable no-console */

import type {SAFE_ANY} from './type';

import chalk from 'chalk';
import {default as _gradientString} from 'gradient-string';

export const defaultColors = ['#F54180', '#338EF7'] as const;

export const gradientString = _gradientString(...defaultColors);

const logPrefix = gradientString('HeroUI CLI:');

export type PrefixLogType = Extract<
  keyof typeof Logger,
  'error' | 'gradient' | 'info' | 'log' | 'warn' | 'success'
>;
export class Logger {
  constructor() {}

  static log(...args: Parameters<typeof console.log>) {
    console.log(...args);
  }

  static info(...args: Parameters<typeof console.info>) {
    console.info(...args.map((item) => chalk.blue(item)));
  }

  static success(...args: Parameters<typeof console.info>) {
    console.info(...args.map((item) => chalk.green(item)));
  }

  static warn(...args: Parameters<typeof console.warn>) {
    console.warn(...args.map((item) => chalk.yellow(item)));
  }

  static error(...args: Parameters<typeof console.error>) {
    console.error(...args.map((item) => chalk.red(item)));
  }

  static grey(...args: Parameters<typeof console.log>) {
    console.log(...args.map((item) => chalk.gray(item)));
  }

  static gradient(content: string | number | boolean, options?: {colors?: tinycolor.ColorInput[]}) {
    this.log(_gradientString(...(options?.colors ?? defaultColors))(String(content)));
  }

  static prefix(type: PrefixLogType, ...args: SAFE_ANY) {
    return this[type](logPrefix, ...args);
  }

  static newLine(lines?: number) {
    if (!lines) lines = 1;

    for (let i = 0; i < lines; i++) this.log();
  }
}
