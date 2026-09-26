import {Logger} from '@helpers/logger';
import {findMostMatchText, printMostMatchText} from '@helpers/math-diff';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

describe('math-diff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the closest command name', () => {
    expect(findMostMatchText(['install', 'init', 'env'], 'inst')).toBe('install');
    expect(findMostMatchText(['install', 'init'], 'zzzz')).toBeNull();
  });

  it('prints a suggestion and exits', () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    expect(() => printMostMatchText(['install', 'init'], 'inst')).toThrow(ExitError);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('install'));
  });

  it('prints an unknown option and exits when nothing matches', () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    expect(() => printMostMatchText(['install'], 'zzzz')).toThrow(ExitError);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unknown option'));
  });
});
