import {envAction} from 'src/actions/env-action';
import {describe, expect, it, vi} from 'vitest';

vi.mock('envinfo', () => ({
  default: {
    run: async () =>
      JSON.stringify({
        Binaries: {Node: 'v22.0.0'},
        System: {OS: 'macOS'}
      })
  }
}));

import {ExitError, installExitMock} from 'test/helpers/exit';

describe('envAction', () => {
  it('prints the environment and exits', async () => {
    installExitMock();

    await expect(envAction()).rejects.toBeInstanceOf(ExitError);
    await expect(envAction()).rejects.toMatchObject({code: 0});
  });
});
