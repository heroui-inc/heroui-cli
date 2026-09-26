import {Logger} from '@helpers/logger';
import {afterEach, describe, expect, it, vi} from 'vitest';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes each level to the matching console method', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    Logger.log('plain');
    Logger.info('info');
    Logger.success('ok');
    Logger.warn('warn');
    Logger.error('error');
    Logger.grey('grey');
    Logger.gradient('brand');
    Logger.gradient('brand', {colors: ['#000000', '#ffffff']});
    Logger.prefix('info', 'prefixed');
    Logger.newLine(2);

    expect(log).toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(String(info.mock.calls.at(-1)?.[1])).toContain('prefixed');
  });
});
