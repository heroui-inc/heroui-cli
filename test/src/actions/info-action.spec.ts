import {Logger} from '@helpers/logger';
import {infoAction} from 'src/actions/info-action';
import {store} from 'src/constants/store';
import {cacheData, getCacheData, isExpired} from 'src/scripts/cache/cache';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

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

describe('infoAction', () => {
  afterEach(() => {
    store.json = false;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.mocked(isExpired).mockReturnValue(true);
    vi.mocked(getCacheData).mockReturnValue({});
  });

  it('prints the API Reference section', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    vi.stubGlobal('fetch', mockDocs());

    await expect(infoAction('Button')).rejects.toMatchObject({code: 0});
    expect(log).toHaveBeenCalledWith(expect.stringContaining('## API Reference'));
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('## Usage'));
    expect(cacheData).toHaveBeenCalled();
  });

  it('prints the API reference as JSON', async () => {
    installExitMock();
    store.json = true;
    const read = captureStdout();

    vi.stubGlobal('fetch', mockDocs());

    await expect(infoAction('Button')).rejects.toMatchObject({code: 0});
    expect(JSON.parse(read())).toMatchObject({
      command: 'info',
      component: 'button',
      ok: true
    });
    expect(JSON.parse(read()).api).toContain('## API Reference');
  });

  it('suggests a close component name', async () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    vi.stubGlobal('fetch', mockDocs());

    await expect(infoAction('btn')).rejects.toBeInstanceOf(ExitError);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('button'));
  });

  it('errors when the API Reference heading is absent', async () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    vi.stubGlobal('fetch', mockDocs({'(buttons)/button.mdx': '## Usage\n\nNo props here.\n'}));

    await expect(infoAction('button')).rejects.toMatchObject({code: 1});
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('https://heroui.com/docs/react/components/button')
    );
  });

  it('uses a cached page without fetching it again', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn();

    vi.mocked(isExpired).mockImplementation((key) => key !== 'docs:react:components:button');
    vi.mocked(getCacheData).mockReturnValue({
      'docs:react:components:button': {
        date: new Date(),
        execResult: '## API Reference\n\n| Prop | Type |\n',
        expiredDate: Date.now() + 1000,
        expiredFormatDate: '',
        formatDate: '',
        version: ''
      }
    });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(mockDocs());

    await expect(infoAction('button')).rejects.toMatchObject({code: 0});
    expect(log).toHaveBeenCalledWith(expect.stringContaining('| Prop | Type |'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('meta.json');
  });
});
