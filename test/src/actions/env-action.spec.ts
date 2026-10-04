import {envAction} from 'src/actions/env-action';
import {store} from 'src/constants/store';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

vi.mock('envinfo', () => ({
  default: {
    run: async () =>
      JSON.stringify({
        Binaries: {Node: 'v22.0.0'},
        System: {OS: 'macOS'}
      })
  }
}));

describe('envAction', () => {
  afterEach(() => {
    store.json = false;
  });

  it('prints the environment as JSON', async () => {
    installExitMock();
    store.json = true;
    const read = captureStdout();

    await expect(envAction()).rejects.toMatchObject({code: 0});
    expect(JSON.parse(read())).toEqual({
      command: 'env',
      environment: {
        Binaries: {Node: 'v22.0.0'},
        System: {OS: 'macOS'}
      },
      ok: true
    });
  });

  it('prints the environment and exits', async () => {
    installExitMock();

    await expect(envAction()).rejects.toBeInstanceOf(ExitError);
    await expect(envAction()).rejects.toMatchObject({code: 0});
  });
});
