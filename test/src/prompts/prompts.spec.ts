import {store} from 'src/constants/store';
import {getConfirm, getSelect, getText} from 'src/prompts';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

const prompts = vi.hoisted(() => vi.fn());

vi.mock('@winches/prompts', () => ({
  default: prompts
}));

describe('prompts', () => {
  afterEach(() => {
    store.json = false;
    prompts.mockReset();
    vi.restoreAllMocks();
  });

  it('returns text, select, and confirm values', async () => {
    prompts
      .mockResolvedValueOnce({value: 'app'})
      .mockResolvedValueOnce({value: 'pnpm'})
      .mockResolvedValueOnce({
        value: true
      });

    await expect(getText('name', 'heroui-app')).resolves.toBe('app');
    await expect(getSelect('manager', [{title: 'pnpm', value: 'pnpm'}])).resolves.toBe('pnpm');
    await expect(getConfirm('continue?')).resolves.toBe(true);
    expect(prompts.mock.calls[0]?.[0]).toMatchObject({initial: 'heroui-app', type: 'text'});
  });

  it('treats a non-true confirm result as false', async () => {
    prompts.mockResolvedValueOnce({value: false});

    await expect(getConfirm('continue?')).resolves.toBe(false);
  });

  it('exits when the prompt is cancelled', async () => {
    installExitMock();
    prompts.mockImplementation(async (_question, options: {onCancel: () => void}) => {
      options.onCancel();

      return {value: undefined};
    });

    await expect(getText('name')).rejects.toBeInstanceOf(ExitError);
  });

  it('prints a cancellation object when JSON mode is on', async () => {
    installExitMock();
    store.json = true;
    const read = captureStdout();

    prompts.mockImplementation(async (_question, options: {onCancel: () => void}) => {
      options.onCancel();

      return {value: undefined};
    });

    await expect(getSelect('manager', [{title: 'pnpm', value: 'pnpm'}])).rejects.toMatchObject({
      code: 0
    });
    expect(JSON.parse(read())).toEqual({cancelled: true, ok: true});
  });
});
