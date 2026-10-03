import {Logger} from '@helpers/logger';
import {docAction} from 'src/actions/doc-action';
import {cacheData, getCacheData, isExpired} from 'src/scripts/cache/cache';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

vi.mock('src/scripts/cache/cache', () => ({
  cacheData: vi.fn(),
  getCacheData: vi.fn(() => ({})),
  isExpired: vi.fn(() => true)
}));

const catalog = JSON.stringify({
  pages: ['---Components---', 'index', '(buttons)/button', '(buttons)/button-group']
});

const buttonDoc = ['## Usage', '', 'hello', '', '## API Reference', '', '| Prop | Type |', ''].join(
  '\n'
);

function mockDocs(pages: Record<string, string> = {'(buttons)/button.mdx': buttonDoc}) {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/meta.json')) {
      return new Response(catalog, {status: 200});
    }

    const page = Object.keys(pages).find((name) => url.endsWith(name));

    if (page) {
      return new Response(pages[page], {status: 200});
    }

    return new Response('missing', {status: 404, statusText: 'Not Found'});
  });
}

describe('docAction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.mocked(isExpired).mockReturnValue(true);
    vi.mocked(getCacheData).mockReturnValue({});
  });

  it('prints the full documentation page', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    vi.stubGlobal('fetch', mockDocs());

    await expect(docAction('Button')).rejects.toMatchObject({code: 0});
    expect(log).toHaveBeenCalledWith(expect.stringContaining('## Usage'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('## API Reference'));
    expect(cacheData).toHaveBeenCalled();
  });

  it('suggests a close component name', async () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    vi.stubGlobal('fetch', mockDocs());

    await expect(docAction('btn')).rejects.toBeInstanceOf(ExitError);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('button'));
  });

  it('uses a cached page without fetching it again', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn();

    vi.mocked(isExpired).mockImplementation((key) => key !== 'docs:react:components:button');
    vi.mocked(getCacheData).mockReturnValue({
      'docs:react:components:button': {
        date: new Date(),
        execResult: '## Usage\n\nhello\n\n## API Reference\n\n| Prop | Type |\n',
        expiredDate: Date.now() + 1000,
        expiredFormatDate: '',
        formatDate: '',
        version: ''
      }
    });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(mockDocs());

    await expect(docAction('button')).rejects.toMatchObject({code: 0});
    expect(log).toHaveBeenCalledWith(expect.stringContaining('## Usage'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('| Prop | Type |'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('meta.json');
  });
});
