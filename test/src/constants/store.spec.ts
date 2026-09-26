import {getStore, getStoreSync, store} from 'src/constants/store';
import {afterEach, describe, expect, it, vi} from 'vitest';

const getLatestVersion = vi.hoisted(() => vi.fn(async () => '4.0.0'));

vi.mock('src/scripts/helpers', () => ({
  getLatestVersion
}));

describe('store', () => {
  afterEach(() => {
    store.cliLatestVersion = '';
    store.debug = false;
    getLatestVersion.mockClear();
  });

  it('returns a stored debug flag without fetching', async () => {
    store.debug = true;

    await expect(getStore('debug')).resolves.toBe(true);
    expect(getStoreSync('debug')).toBe(true);
    expect(getLatestVersion).not.toHaveBeenCalled();
  });

  it('fetches the CLI version once and then reads it from memory', async () => {
    await expect(getStore('cliLatestVersion')).resolves.toBe('4.0.0');
    await expect(getStore('cliLatestVersion')).resolves.toBe('4.0.0');

    expect(getLatestVersion).toHaveBeenCalledTimes(1);
    expect(getLatestVersion).toHaveBeenCalledWith('heroui-cli');
    expect(getStoreSync('cliLatestVersion')).toBe('4.0.0');
  });

  it('returns a falsy debug value as-is', async () => {
    await expect(getStore('debug')).resolves.toBe(false);
  });
});
