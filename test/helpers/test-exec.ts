import {exec} from 'src/helpers/exec';

import {TEST_ROOT} from 'test/constants';

export const RUN_CLI_CMD = `tsx ../src/index.ts`;

export const testExec = async (command: string) => {
  return await exec(command, {cwd: TEST_ROOT});
};
