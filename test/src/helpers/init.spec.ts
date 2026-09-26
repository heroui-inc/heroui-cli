import {checkInitOptions} from '@helpers/init';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

describe('checkInitOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a known template and package manager', () => {
    expect(() => checkInitOptions('vite', 'pnpm')).not.toThrow();
    expect(() => checkInitOptions(undefined, undefined)).not.toThrow();
  });

  it('exits when the template or package manager is unknown', () => {
    installExitMock();

    expect(() => checkInitOptions('vitee' as 'vite')).toThrow(ExitError);
    expect(() => checkInitOptions('app', 'pnpmx' as 'pnpm')).toThrow(ExitError);
  });
});
