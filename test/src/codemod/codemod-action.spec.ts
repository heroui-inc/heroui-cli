import {Logger} from '@helpers/logger';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

import {codemodAction} from '../../../packages/codemod/src/actions/codemod-action';
import {migrateAction} from '../../../packages/codemod/src/actions/migrate-action';
import {DEBUG} from '../../../packages/codemod/src/helpers/debug';
import {getOptionsValue} from '../../../packages/codemod/src/helpers/options';
import {handleCodemodParseError, runCodemodPreAction} from '../../../packages/codemod/src/program';

vi.mock('../../../packages/codemod/src/actions/migrate-action', () => ({
  migrateAction: vi.fn()
}));

describe('codemod action and program', () => {
  afterEach(() => {
    vi.clearAllMocks();
    DEBUG.enabled = false;
  });

  it('prints usage and exits for a missing or unknown codemod', async () => {
    installExitMock();
    vi.spyOn(Logger, 'log').mockImplementation(() => {});
    vi.spyOn(Logger, 'grey').mockImplementation(() => {});
    vi.spyOn(Logger, 'error').mockImplementation(() => {});
    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});

    await expect(codemodAction(undefined as unknown as 'npmrc')).rejects.toMatchObject({code: 0});
    await expect(codemodAction('nope' as unknown as 'npmrc')).rejects.toMatchObject({code: 0});
    expect(migrateAction).not.toHaveBeenCalled();
  });

  it('delegates a known codemod to migrate', () => {
    codemodAction('import-heroui');

    expect(migrateAction).toHaveBeenCalledWith(['.'], {codemod: 'import-heroui'});
  });

  it('stores debug and format flags before a command', async () => {
    await runCodemodPreAction({rawArgs: ['node', 'heroui-codemod', '--debug', '--format']});

    expect(DEBUG.enabled).toBe(true);
    expect(getOptionsValue('format')).toBe(true);

    await runCodemodPreAction({rawArgs: ['node', 'heroui-codemod', '-d', '-f']});
    expect(DEBUG.enabled).toBe(true);
    expect(getOptionsValue('format')).toBe(true);

    await runCodemodPreAction({rawArgs: ['node', 'heroui-codemod']});
    expect(DEBUG.enabled).toBe(false);
    expect(getOptionsValue('format')).toBe(false);
  });

  it('logs a parse failure and exits', async () => {
    installExitMock();
    vi.spyOn(Logger, 'error').mockImplementation(() => {});
    vi.spyOn(Logger, 'log').mockImplementation(() => {});
    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});

    await expect(handleCodemodParseError(new Error('bad'))).rejects.toBeInstanceOf(ExitError);
  });
});
