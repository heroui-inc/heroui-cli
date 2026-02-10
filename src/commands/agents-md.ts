import type {Command} from 'commander';

import {docsAction} from '../actions/docs-action';

export function registerAgentsMdCommand(cmd: Command) {
  cmd
    .command('agents-md')
    .description(
      'Download HeroUI documentation for AI coding agents (Claude, Cursor, etc.) to the current project'
    )
    .option('--react', 'Include only React docs')
    .option('--native', 'Include only Native docs')
    .option(
      '--output <files...>',
      'Target file path(s) (e.g., AGENTS.md, or AGENTS.md CLAUDE.md for multiple)'
    )
    .option('--ssh', 'Use SSH instead of HTTPS for git clone')
    .action(docsAction);
}
