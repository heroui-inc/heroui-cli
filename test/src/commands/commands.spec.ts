import {Command} from 'commander';
import {registerCommands} from 'src/commands';
import {registerAgentsMdCommand} from 'src/commands/agents-md';
import {registerDoctorCommand} from 'src/commands/doctor';
import {registerEnvCommand} from 'src/commands/env';
import {registerInitCommand} from 'src/commands/init';
import {registerInstallCommand} from 'src/commands/install';
import {registerListCommand} from 'src/commands/list';
import {registerUninstallCommand} from 'src/commands/uninstall';
import {registerUpgradeCommand} from 'src/commands/upgrade';
import {describe, expect, it} from 'vitest';

function flags(name: string, program: Command) {
  return program.commands
    .find((command) => command.name() === name)
    ?.options.map((option) => option.flags);
}

describe('command registration', () => {
  it('registers every command and its options', () => {
    const program = new Command();

    registerCommands(program);

    expect(program.commands.map((command) => command.name())).toEqual([
      'init',
      'install',
      'upgrade',
      'uninstall',
      'list',
      'env',
      'doctor',
      'agents-md'
    ]);
    expect(flags('init', program)?.join(' ')).toContain('--template');
    expect(flags('init', program)?.join(' ')).toContain('--package');
    expect(flags('install', program)?.join(' ')).toContain('--packagePath');
    expect(flags('upgrade', program)?.join(' ')).toContain('--packagePath');
    expect(flags('uninstall', program)?.join(' ')).toContain('--packagePath');
    expect(flags('list', program)?.join(' ')).toContain('--packagePath');
    expect(flags('env', program)?.join(' ')).toContain('--packagePath');
    expect(flags('doctor', program)?.join(' ')).toContain('--packagePath');
    expect(flags('agents-md', program)?.join(' ')).toContain('--react');
    expect(flags('agents-md', program)?.join(' ')).toContain('--output');
    expect(flags('agents-md', program)?.join(' ')).toContain('--ssh');
  });

  it('can register each command on its own program', () => {
    const register = [
      registerInitCommand,
      registerInstallCommand,
      registerUpgradeCommand,
      registerUninstallCommand,
      registerListCommand,
      registerEnvCommand,
      registerDoctorCommand,
      registerAgentsMdCommand
    ];

    for (const registerCommand of register) {
      const program = new Command();

      registerCommand(program);
      expect(program.commands).toHaveLength(1);
    }
  });
});
