import type {Command} from 'commander';

import {designMdAction} from '../actions/docs-action';

export function registerDesignMdCommand(cmd: Command) {
  cmd
    .command('design-md')
    .description('Download HeroUI design guidance for AI coding agents')
    .option('--react', 'Download React design guidance')
    .option('--native', 'Download Native design guidance')
    .option('--output <file>', 'Destination file path', 'DESIGN.md')
    .action(designMdAction);
}
