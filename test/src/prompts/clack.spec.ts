import {cancel, confirm, select, text} from '@clack/prompts';
import {cancelClack, confirmClack, selectClack, taskClack, textClack} from 'src/prompts/clack';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const spinner = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn()
}));

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: (value: unknown) => value === 'CANCEL',
  select: vi.fn(),
  spinner: () => spinner,
  text: vi.fn()
}));

describe('clack prompts', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns prompt values and ignores non-cancel results', async () => {
    vi.mocked(text).mockResolvedValueOnce('app' as never);
    vi.mocked(select).mockResolvedValueOnce('pnpm' as never);
    vi.mocked(confirm).mockResolvedValueOnce(true as never);

    await expect(textClack({message: 'name'})).resolves.toBe('app');
    await expect(selectClack({message: 'manager', options: []})).resolves.toBe('pnpm');
    await expect(confirmClack({message: 'ok'})).resolves.toBe(true);
    expect(() => cancelClack('keep-going')).not.toThrow();
  });

  it('exits when a prompt is cancelled', async () => {
    installExitMock();
    vi.mocked(text).mockResolvedValueOnce('CANCEL' as never);

    await expect(textClack({message: 'name'})).rejects.toBeInstanceOf(ExitError);
    expect(cancel).toHaveBeenCalled();
  });

  it('stops the spinner after a successful task', async () => {
    await expect(
      taskClack({
        successText: 'done',
        task: Promise.resolve('value'),
        text: 'working'
      })
    ).resolves.toBe('value');
    expect(spinner.start).toHaveBeenCalledWith('working');
    expect(spinner.stop).toHaveBeenCalledWith('done');
  });

  it('accepts a non-promise task', async () => {
    await expect(taskClack({task: 'sync', text: 'working'})).resolves.toBe('sync');
  });

  it('cancels and exits when the task fails', async () => {
    installExitMock();

    await expect(
      taskClack({
        failText: 'failed',
        task: Promise.reject(new Error('nope')),
        text: 'working'
      })
    ).rejects.toBeInstanceOf(ExitError);
    expect(spinner.stop).toHaveBeenCalledWith('failed');
    expect(cancel).toHaveBeenCalledWith('nope');
  });

  it('stringifies a non-error task failure', async () => {
    installExitMock();

    await expect(taskClack({task: Promise.reject('bad'), text: 'working'})).rejects.toBeInstanceOf(
      ExitError
    );
    expect(cancel).toHaveBeenCalledWith('bad');
  });
});
