import {syncDocs} from 'src/scripts/sync';
import {afterEach, describe, expect, it, vi} from 'vitest';

const fsState = vi.hoisted(() => {
  const readme = [
    'Usage: heroui [command]',
    '',
    'init a project',
    '',
    '```bash',
    'heroui init',
    '```',
    '',
    '## Documentation',
    ''
  ].join('\n');
  const routes = {
    routes: [
      {
        key: 'api-references',
        routes: [{key: 'cli-api', updated: false}]
      }
    ]
  };

  return {
    missing: '',
    readme,
    routes,
    writes: new Map<string, string>()
  };
});

vi.mock('node:fs', async () => {
  const actual = (await vi.importActual('node:fs')) as {
    existsSync: (file: unknown) => boolean;
    readFileSync: (file: unknown, encoding?: unknown) => string;
    writeFileSync: (file: unknown, data: unknown) => void;
  };

  return {
    ...actual,
    existsSync: (file: unknown) => {
      const target = String(file);

      if (fsState.missing && target.endsWith(fsState.missing)) {
        return false;
      }
      if (
        target.endsWith('README.md') ||
        target.endsWith('cli-api.mdx') ||
        target.endsWith('routes.json')
      ) {
        return true;
      }

      return actual.existsSync(file);
    },
    readFileSync: ((file: unknown) => {
      const target = String(file);

      if (target.endsWith('README.md')) {
        return fsState.readme;
      }
      if (target.endsWith('cli-api.mdx')) {
        return 'prefix Usage: heroui [command]\nold content';
      }
      if (target.endsWith('routes.json')) {
        return JSON.stringify(fsState.routes);
      }

      return actual.readFileSync(file);
    }) as typeof actual.readFileSync,
    writeFileSync: ((file: unknown, data: unknown) => {
      fsState.writes.set(String(file), String(data));
    }) as typeof actual.writeFileSync
  };
});

describe('syncDocs', () => {
  afterEach(() => {
    fsState.missing = '';
    fsState.writes.clear();
  });

  it('rewrites the CLI reference and marks the route updated', () => {
    syncDocs();

    const mdx = [...fsState.writes.values()].find((value) => value.includes('codeBlock bash'));
    const routeFile = [...fsState.writes.values()].find((value) => value.includes('cli-api'));

    expect(mdx).toContain('init a project');
    expect(mdx).toContain('```codeBlock bash');
    expect(mdx).not.toContain('old content');
    expect(JSON.parse(routeFile ?? '{}').routes[0].routes[0].updated).toBe(true);
  });

  it('throws when the API reference is missing', () => {
    fsState.missing = 'cli-api.mdx';

    expect(() => syncDocs()).toThrow('CLI API reference');
  });

  it('throws when the routes config is missing', () => {
    fsState.missing = 'routes.json';

    expect(() => syncDocs()).toThrow('docs routes config');
  });
});
