import type {Command} from 'commander';

import {registerAddCommand} from './add';
import {registerDoctorCommand} from './doctor';
import {registerEnvCommand} from './env';
import {registerInitCommand} from './init';
import {registerListCommand} from './list';
import {registerRemoveCommand} from './remove';
import {registerUpgradeCommand} from './upgrade';

export function registerCommands(cmd: Command) {
  registerInitCommand(cmd);
  registerAddCommand(cmd);
  registerUpgradeCommand(cmd);
  registerRemoveCommand(cmd);
  registerListCommand(cmd);
  registerEnvCommand(cmd);
  registerDoctorCommand(cmd);
}
