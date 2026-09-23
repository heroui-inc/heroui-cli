import type {Agent} from '@helpers/detect';
import type {GetUnionLastValue, InitOptions} from '@helpers/type';

import {existsSync, renameSync} from 'node:fs';

import * as p from '@clack/prompts';
import chalk from 'chalk';
import {join} from 'pathe';

import {changeNpmrc} from '@helpers/actions/init/change-npmrc';
import {downloadTemplate} from '@helpers/fetch';
import {checkInitOptions} from '@helpers/init';
import {getPackageManagerInfo} from '@helpers/utils';
import {selectClack, taskClack, textClack} from 'src/prompts/clack';

import {ROOT} from '../../src/constants/path';
import {
  APP_DIR,
  APP_REPO,
  PAGES_DIR,
  PAGES_REPO,
  REACT_ROUTER_DIR,
  REACT_ROUTER_REPO,
  VITE_DIR,
  VITE_REPO,
  templatesMap
} from '../../src/constants/templates';

/**
 * `declare let _exhaustiveCheck: never` emitted nothing but left the assignment
 * behind, which throws a ReferenceError in an ESM module instead of failing the
 * build. A function keeps the compile-time check without the runtime trap.
 */
function assertNeverTemplate(template: never): never {
  throw new Error(`Unsupported template: ${String(template)}`);
}

/**
 * Reject names that would escape the working directory or nest the project in
 * a path the user did not ask for.
 */
function assertValidProjectName(projectName: string) {
  if (!projectName || projectName === '.' || projectName === '..') {
    p.cancel(`The project name ${chalk.redBright(projectName)} is not valid`);
    process.exit(1);
  }

  if (/[/\\]/.test(projectName)) {
    p.cancel(`The project name ${chalk.redBright(projectName)} must not contain a path separator`);
    process.exit(1);
  }
}

export async function initAction(_projectName?: string, options: InitOptions = {}) {
  const {package: _package, template: _template} = options;

  /** ======================== Check invalid options ======================== */
  checkInitOptions(_template, _package);

  /** ======================== Welcome title ======================== */
  p.intro(chalk.cyanBright('Create a new project'));

  /** ======================== Get the init info ======================== */
  const {packageName, projectName, template} = await getTableInfo(
    _package,
    _projectName,
    _template
  );
  const {run} = getPackageManagerInfo(packageName);

  /** ======================== Generate template ======================== */
  assertValidProjectName(projectName);

  // Detect if the project name already exists
  if (existsSync(join(ROOT, projectName))) {
    p.cancel(`The project name ${chalk.redBright(projectName)} already exists`);
    process.exit(1);
  }

  if (template === 'app') {
    await generateTemplate(APP_REPO, APP_DIR);
    renameTemplate(APP_DIR, projectName);
  } else if (template === 'pages') {
    await generateTemplate(PAGES_REPO, PAGES_DIR);
    renameTemplate(PAGES_DIR, projectName);
  } else if (template === 'vite') {
    await generateTemplate(VITE_REPO, VITE_DIR);
    renameTemplate(VITE_DIR, projectName);
  } else if (template === 'react-router') {
    await generateTemplate(REACT_ROUTER_REPO, REACT_ROUTER_DIR);
    renameTemplate(REACT_ROUTER_DIR, projectName);
  } else {
    // If add new template and not update this template, it will be exhaustive check error
    assertNeverTemplate(template);
  }

  const npmrcFile = join(ROOT, projectName, '.npmrc');

  /** ======================== Change default npmrc content ======================== */
  changeNpmrc(npmrcFile);

  /** ======================== Add guide ======================== */
  p.note(
    `cd ${chalk.cyanBright(projectName)}\n${chalk.cyanBright(packageName)} install`,
    'Next steps'
  );

  p.outro(`🚀 Get started with ${chalk.cyanBright(`${packageName} ${run} dev`)}`);

  process.exit(0);
}

/** ======================== Helper function ======================== */
async function generateTemplate(url: string, extractDir: string) {
  // tar merges into an existing directory rather than failing, which would mix
  // the download with whatever is already there
  if (existsSync(join(ROOT, extractDir))) {
    p.cancel(
      `Cannot extract the template, ${chalk.redBright(extractDir)} already exists. Remove it and try again.`
    );
    process.exit(1);
  }

  await taskClack({
    failText: 'Template creation failed',
    successText: 'Template created successfully!',
    task: downloadTemplate(ROOT, url),
    text: 'Creating template...'
  });
}

function renameTemplate(originName: string, projectName: string) {
  const target = join(ROOT, projectName);

  // The download sits between the first existence check and this rename, so
  // re-check rather than overwriting a directory created in the meantime
  if (existsSync(target)) {
    p.cancel(`The project name ${chalk.redBright(projectName)} already exists`);
    process.exit(1);
  }

  try {
    renameSync(join(ROOT, originName), target);
  } catch (error) {
    p.cancel(`rename Error: ${error}`);
    process.exit(1);
  }
}

export type GenerateOptions<T, Last = GetUnionLastValue<T>> = [T] extends [never]
  ? []
  : [
      ...GenerateOptions<Exclude<T, Last>>,
      {
        label: string;
        value: Last;
        hint: string;
      }
    ];

async function getTableInfo(packageName?: string, projectName?: string, template?: string) {
  const options: GenerateOptions<Exclude<InitOptions['template'], undefined>> = [
    {
      hint: 'A Next.js 16 with app directory template pre-configured with HeroUI (v3) and Tailwind CSS.',
      label: 'App',
      value: 'app'
    },
    {
      hint: 'A Next.js 16 with pages directory template pre-configured with HeroUI (v3) and Tailwind CSS.',
      label: 'Pages',
      value: 'pages'
    },
    {
      hint: 'A Vite template pre-configured with HeroUI (v3) and Tailwind CSS.',
      label: 'Vite',
      value: 'vite'
    },
    {
      hint: 'A React Router template pre-configured with HeroUI (v3) and Tailwind CSS.',
      label: 'React Router',
      value: 'react-router'
    }
  ];

  if (!template) {
    template = (await selectClack({
      message: 'Select a template (Enter to select)',
      options
    })) as string;
  }

  if (!projectName) {
    projectName = (await textClack({
      initialValue: templatesMap[template as keyof typeof templatesMap],
      message: 'New project name (Enter to skip with default name)',
      placeholder: templatesMap[template as keyof typeof templatesMap]
    })) as string;
  }

  if (!packageName) {
    packageName = (await selectClack({
      message: 'Select a package manager (Enter to select)',
      options: [
        {
          label: chalk.gray('npm'),
          value: 'npm'
        },
        {
          label: chalk.gray('yarn'),
          value: 'yarn'
        },
        {
          label: chalk.gray('pnpm'),
          value: 'pnpm'
        },
        {
          label: chalk.gray('bun'),
          value: 'bun'
        }
      ]
    })) as Agent;
  }

  return {
    packageName: packageName as Agent,
    projectName,
    template: template as Exclude<InitOptions['template'], undefined>
  };
}
