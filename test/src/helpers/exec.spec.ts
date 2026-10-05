import {execSync} from 'node:child_process';

import {CLIError} from '@helpers/errors';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => 'ok')
}));

describe('exec', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs the command and returns stdout', async () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});

    await expect(exec('npm install', {cwd: '/tmp'})).resolves.toBe('ok');
    expect(log).toHaveBeenCalledWith('npm install');
    expect(execSync).toHaveBeenCalledWith(
      'npm install',
      expect.objectContaining({cwd: '/tmp', stdio: 'inherit'})
    );
  });

  it('can skip logging and tolerate empty stdout', async () => {
    vi.mocked(execSync).mockReturnValueOnce(null as never);
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    await expect(exec('true', {logCmd: false})).resolves.toBe('');
    expect(log).not.toHaveBeenCalled();
  });

  it('wraps a package-manager failure as a CLI error', async () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('npm ERR! code ETARGET');
    });

    await expect(exec('npm install', {logCmd: false})).rejects.toThrow(CLIError);
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('npm ERR! code ETARGET');
    });
    await expect(exec('npm install', {logCmd: false})).rejects.toThrow(
      'Command failed: npm install'
    );
  });
});
