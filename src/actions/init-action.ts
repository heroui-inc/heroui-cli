import type {Agent} from '@helpers/detect';
import type {GetUnionLastValue} from '@helpers/type';

import {existsSync, renameSync} from 'node:fs';

import * as p from '@clack/prompts';
import chalk from 'chalk';
import {join} from 'pathe';

import {changeNpmrc} from '@helpers/actions/init/change-npmrc';
import {downloadTemplate} from '@helpers/fetch';
import {fixPnpm} from '@helpers/fix';
import {checkInitOptions} from '@helpers/init';
import {getPackageManagerInfo} from '@helpers/utils';
import {selectClack, taskClack, textClack} from 'src/prompts/clack';
import {resolver} from 'src/scripts/path';

import {ROOT} from '../../src/constants/path';
import {
  APP_DIR,
  APP_NAME,
  APP_REPO,
  PAGES_DIR,
  PAGES_NAME,
  PAGES_REPO,
  VITE_DIR,
  VITE_NAME,
  VITE_REPO
} from '../../src/constants/templates';

export interface InitActionOptions {
  template?: 'app' | 'pages' | 'vite';
  package?: Agent;
}

export const templatesMap: Record<Required<InitActionOptions>['template'], string> = {
  app: APP_NAME,
  pages: PAGES_NAME,
  vite: VITE_NAME
};

export async function initAction(_projectName: string, options: InitActionOptions) {
  const {package: _package = 'npm', template: _template} = options;

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
  // Detect if the project name already exists
  if (existsSync(resolver(`${ROOT}/${projectName}`))) {
    p.cancel(`The project name ${chalk.redBright(projectName)} already exists`);
    process.exit(1);
  }

  if (template === 'app') {
    await generateTemplate(APP_REPO);
    renameTemplate(APP_DIR, projectName);
  } else if (template === 'pages') {
    await generateTemplate(PAGES_REPO);
    renameTemplate(PAGES_DIR, projectName);
  } else if (template === 'vite') {
    await generateTemplate(VITE_REPO);
    renameTemplate(VITE_DIR, projectName);
  }

  const npmrcFile = resolver(`${ROOT}/${projectName}/.npmrc`);

  /** ======================== Change default npmrc content ======================== */
  changeNpmrc(npmrcFile);

  /** ======================== Pnpm setup (optional) ======================== */
  if (packageName === 'pnpm') {
    fixPnpm(npmrcFile, true, false, ({message}) => {
      p.log.message(message);
    });
  }

  /** ======================== Add guide ======================== */
  p.note(
    `cd ${chalk.cyanBright(projectName)}\n${chalk.cyanBright(packageName)} install`,
    'Next steps'
  );

  p.outro(`🚀 Get started with ${chalk.cyanBright(`${packageName} ${run} dev`)}`);

  process.exit(0);
}

/** ======================== Helper function ======================== */
async function generateTemplate(url: string) {
  await taskClack({
    failText: 'Template creation failed',
    successText: 'Template created successfully!',
    task: downloadTemplate(ROOT, url),
    text: 'Creating template...'
  });
}

function renameTemplate(originName: string, projectName: string) {
  try {
    renameSync(join(ROOT, originName), join(ROOT, projectName));
  } catch (error) {
    if (error) {
      p.cancel(`rename Error: ${error}`);
      process.exit(0);
    }
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
  const options: GenerateOptions<Exclude<InitActionOptions['template'], undefined>> = [
    {
      hint: 'A Next.js 14 with app directory template pre-configured with HeroUI (v2) and Tailwind CSS.',
      label: chalk.gray('App'),
      value: 'app'
    },
    {
      hint: 'A Next.js 14 with pages directory template pre-configured with HeroUI (v2) and Tailwind CSS.',
      label: chalk.gray('Pages'),
      value: 'pages'
    },
    {
      hint: 'A Vite template pre-configured with HeroUI (v2) and Tailwind CSS.',
      label: chalk.gray('Vite'),
      value: 'vite'
    }
  ];

  template = (await selectClack({
    initialValue: template,
    message: 'Select a template (Enter to select)',
    options
  })) as string;

  projectName = (await textClack({
    initialValue: projectName ?? templatesMap[template],
    message: 'New project name (Enter to skip with default name)',
    placeholder: projectName ?? templatesMap[template]
  })) as string;

  packageName = (await selectClack({
    initialValue: packageName,
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

  return {
    packageName: packageName as Agent,
    projectName,
    template
  };
}
