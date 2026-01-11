/* eslint-disable no-console */

import type {SAFE_ANY} from './type';

import chalk from 'chalk';
import {default as _gradientString} from 'gradient-string';

/**
 * Default gradient colors used for CLI branding
 */
export const defaultColors = ['#F54180', '#338EF7'] as const;

/**
 * Pre-configured gradient string function with default colors
 */
export const gradientString = _gradientString(...defaultColors);

const logPrefix = gradientString('HeroUI CLI:');

export type PrefixLogType = Extract<
  keyof typeof Logger,
  'error' | 'gradient' | 'info' | 'log' | 'warn' | 'success'
>;

type LogArgs = Parameters<typeof console.log>;

/**
 * Centralized logging utility for the HeroUI CLI.
 * Provides colored console output methods for different log levels.
 */
export class Logger {
  static log(...args: LogArgs) {
    console.log(...args);
  }

  static info(...args: LogArgs) {
    console.info(...args.map((item) => chalk.blue(item)));
  }

  static success(...args: LogArgs) {
    console.info(...args.map((item) => chalk.green(item)));
  }

  static warn(...args: LogArgs) {
    console.warn(...args.map((item) => chalk.yellow(item)));
  }

  static error(...args: LogArgs) {
    console.error(...args.map((item) => chalk.red(item)));
  }

  static grey(...args: LogArgs) {
    console.log(...args.map((item) => chalk.gray(item)));
  }

  static gradient(content: string | number | boolean, options?: {colors?: tinycolor.ColorInput[]}) {
    this.log(_gradientString(...(options?.colors ?? defaultColors))(String(content)));
  }

  static prefix(type: PrefixLogType, ...args: SAFE_ANY) {
    return this[type](logPrefix, ...args);
  }

  static newLine(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.log();
    }
  }
}
