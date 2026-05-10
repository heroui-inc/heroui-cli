import type {Command} from 'commander';

import {registerAgentsMdCommand} from './agents-md';
import {registerDoctorCommand} from './doctor';
import {registerEnvCommand} from './env';
import {registerInitCommand} from './init';
import {registerInstallCommand} from './install';
import {registerListCommand} from './list';
import {registerUninstallCommand} from './uninstall';
import {registerUpgradeCommand} from './upgrade';

export function registerCommands(cmd: Command) {
  registerInitCommand(cmd);
  registerInstallCommand(cmd);
  registerUpgradeCommand(cmd);
  registerUninstallCommand(cmd);
  registerListCommand(cmd);
  registerEnvCommand(cmd);
  registerDoctorCommand(cmd);
  registerAgentsMdCommand(cmd);
}
