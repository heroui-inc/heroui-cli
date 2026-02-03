import prompts from '@winches/prompts';
import chalk from 'chalk';

import {Logger} from '@helpers/logger';

const defaultPromptOptions: prompts.Options = {
  onCancel: () => {
    Logger.log(`${chalk.red('✖')} Operation cancelled`);
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

export async function getAutocomplete(message: string, choices?: prompts.Choice[]) {
  const result = await prompts(
    {
      message,
      name: 'value',
      type: 'autocomplete',
      ...(choices ? {choices} : {})
    },
    defaultPromptOptions
  );

  return result.value;
}

export async function getAutocompleteMultiselect(message: string, choices?: prompts.Choice[]) {
  const result = await prompts(
    {
      hint: '- Space to select. Return to submit',
      message,
      min: 1,
      name: 'value',
      type: 'autocompleteMultiselect',
      ...(choices ? {choices} : {})
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

export async function getMultiselect(message: string, choices?: prompts.Choice[]) {
  const result = await prompts(
    {
      hint: '- Space to select. Return to submit',
      message,
      min: 1,
      name: 'value',
      type: 'multiselect',
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
