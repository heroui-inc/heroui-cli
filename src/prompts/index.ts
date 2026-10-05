import prompts from '@winches/prompts';
import chalk from 'chalk';

import {commandFromArgv, exitWithJson, isJsonMode} from '@helpers/json-output';
import {Logger} from '@helpers/logger';

const defaultPromptOptions: prompts.Options = {
  onCancel: () => {
    const command = commandFromArgv();

    exitWithJson({cancelled: true, ...(command ? {command} : {}), ok: true}, 0);
    if (!isJsonMode()) {
      Logger.log(`${chalk.red('✖')} Operation cancelled`);
    }
    process.exit(0);
  }
};

export async function getText(message: string, initial?: string) {
  const result = await prompts(
    {
      message,
      name: 'value',
      type: 'text',
      ...(initial ? {initial} : {})
    },
    defaultPromptOptions
  );

  return result.value;
}

export async function getSelect(message: string, choices: prompts.Choice[]) {
  const result = await prompts(
    {
      message,
      name: 'value',
      type: 'select',
      ...(choices ? {choices} : {})
    },
    defaultPromptOptions
  );

  return result.value;
}

export async function getConfirm(message: string): Promise<boolean> {
  const result = await prompts(
    {
      message,
      name: 'value',
      type: 'confirm'
    },
    defaultPromptOptions
  );

  return result.value === true;
}
