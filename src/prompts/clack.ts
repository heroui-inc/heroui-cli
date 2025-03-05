import type {SAFE_ANY} from '@helpers/type';

import {readdirSync, statSync} from 'node:fs';

import {
  type ConfirmOptions,
  spinner as _spinner,
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text
} from '@clack/prompts';
import chalk from 'chalk';
import {join} from 'pathe';

export const cancelClack = (value: SAFE_ANY) => {
  if (isCancel(value)) {
    cancel(`${chalk.red('✖')} Operation cancelled`);
    process.exit(0);
  }
};

export const textClack: typeof text = async (opts) => {
  const result = (await text(opts)) as string;

  cancelClack(result);

  return result;
};

export const selectClack: typeof select = async (opts) => {
  const result = await select(opts);

  cancelClack(result);

  return result;
};

export const multiselectClack: typeof multiselect = async (opts) => {
  const result = await multiselect(opts);

  cancelClack(result);

  return result;
};

export const spinner = _spinner();

export interface TaskClackOptions<T> {
  text: string;
  task: PromiseLike<T> | T;
  successText?: string;
  failText?: string;
}

export const taskClack = async <T>(opts: TaskClackOptions<T>) => {
  const {failText, successText, task, text} = opts;

  let result: string | null = null;

  try {
    spinner.start(text);
    result = await (task instanceof Promise ? task : Promise.resolve(task));
    spinner.stop(successText);
  } catch (error) {
    cancel(failText ?? result ?? 'Task failed');
    process.exit(0);
  }

  return result;
};

export const confirmClack = async (opts: ConfirmOptions) => {
  const result = await confirm(opts);

  cancelClack(result);

  return result;
};

export const getDirectoryClack = async () => {
  const currentDirectories = readdirSync(process.cwd()).filter((dir) =>
    statSync(join(process.cwd(), dir)).isDirectory()
  );
  const options = currentDirectories
    .map((dir) => ({
      label: dir,
      value: dir
    }))
    .filter(
      (dir) =>
        !['node_modules', 'dist', 'build', 'output', /^\./].some((ignore) => {
          if (typeof ignore === 'string') {
            return dir.value.includes(ignore);
          }

          return ignore.test(dir.value);
        })
    );
  const result = options.length
    ? await selectClack({
        message: 'Please select the directory to add the codebase',
        options
      })
    : 'src';

  return result as string;
};
