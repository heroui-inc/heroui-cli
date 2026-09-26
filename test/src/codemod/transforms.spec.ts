import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

import {
  migrateByRegex,
  migrateCallExpressionName,
  migrateImportName,
  migrateJSXElementName
} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-common';
import {migrateCssVariables} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-css-variables';
import {
  migrateImportPackage,
  migrateImportPackageWithPaths
} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-import';
import {
  detectIndent,
  migrateJson,
  migrateNextuiToHeroui
} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-json';
import {migrateLeftFiles} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-left-files';
import {migrateNextuiProvider} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-nextui-provider';
import {migrateNpmrc} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-npmrc';
import {migrateTailwindcss} from '../../../packages/codemod/src/helpers/actions/migrate/migrate-tailwindcss';
import {fetchPackageLatestVersion} from '../../../packages/codemod/src/helpers/https';
import {parseContent} from '../../../packages/codemod/src/helpers/parse';
import {affectedFiles, store, updateStore} from '../../../packages/codemod/src/helpers/store';

vi.mock('../../../packages/codemod/src/helpers/https', () => ({
  fetchPackageLatestVersion: vi.fn(async () => '2.6.0')
}));

describe('codemod transforms', () => {
  let workspace = '';

  afterEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    affectedFiles.clear();
    vi.clearAllMocks();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
      workspace = '';
    }
  });

  function write(name: string, content: string) {
    workspace = workspace || mkdtempSync(path.join(tmpdir(), 'heroui-codemod-'));
    const file = path.join(workspace, name);

    writeFileSync(file, content, 'utf-8');
    updateStore(file, 'rawContent', content);

    return file;
  }

  function parseSource(name: string, content: string) {
    return parseContent(write(name, content));
  }

  it('renames imports, jsx, call expressions, and regex text', () => {
    const named = parseSource('named.tsx', `import {nextui} from 'lib';`);
    const defaults = parseSource('default.tsx', `import nextui from 'lib';`);
    const required = parseSource('require.tsx', `const {nextui} = require('lib');`);
    const requiredDefault = parseSource('require-default.tsx', `const nextui = require('lib');`);
    const jsx = parseSource('view.tsx', 'export const view = <NextUIProvider></NextUIProvider>;');
    const call = parseSource('call.tsx', 'nextui();');

    expect(migrateImportName(named, 'nextui', 'heroui')).toBe(true);
    expect(named?.toSource()).toContain('heroui');
    expect(migrateImportName(defaults, 'nextui', 'heroui')).toBe(true);
    expect(defaults?.toSource()).toContain('heroui');
    expect(migrateImportName(required, 'nextui', 'heroui')).toBe(true);
    expect(required?.toSource()).toContain('heroui');
    expect(migrateImportName(requiredDefault, 'nextui', 'heroui')).toBe(true);
    expect(requiredDefault?.toSource()).toContain('heroui');
    expect(
      migrateImportName(parseSource('clean.tsx', 'const value = 1;'), 'nextui', 'heroui')
    ).toBe(false);
    expect(migrateJSXElementName(jsx, 'NextUIProvider', 'HeroUIProvider')).toBe(true);
    expect(jsx?.toSource()).toContain('HeroUIProvider');
    expect(migrateCallExpressionName(call, 'nextui', 'heroui')).toBe(true);
    expect(call?.toSource()).toContain('heroui()');
    expect(migrateByRegex('keep @nextui-org', '@nextui-org', '@heroui')).toEqual({
      dirtyFlag: true,
      rawContent: 'keep @heroui'
    });
    expect(migrateByRegex('clean', '@nextui-org', '@heroui').dirtyFlag).toBe(false);
    expect(migrateImportName(undefined, 'nextui', 'heroui')).toBe(false);
  });

  it('rewrites import and require package names', () => {
    const parsed = parseSource('button.tsx', `import {Button} from '@nextui-org/react';`);
    const required = parseSource('required.tsx', `const button = require('@nextui-org/react');`);

    expect(parsed && migrateImportPackage(parsed)).toBe(true);
    expect(parsed?.toSource()).toContain('@heroui/react');
    expect(required && migrateImportPackage(required)).toBe(true);
    expect(required?.toSource()).toContain('@heroui/react');

    const file = write('app.tsx', `import {Button} from '@nextui-org/react';`);

    updateStore(file, 'parsedContent', parseContent(file));
    migrateImportPackageWithPaths([file, path.join(workspace, 'missing.json')]);
    expect(readFileSync(file, 'utf-8')).toContain('@heroui/react');
    expect(affectedFiles.has(file)).toBe(true);
  });

  it('renames package.json dependencies and preserves indent', async () => {
    const json = {dependencies: {'@nextui-org/react': '1.0.0'}, devDependencies: {}};

    migrateNextuiToHeroui(json);
    expect(json.dependencies).toEqual({'@heroui/react': '1.0.0'});
    expect(detectIndent('{\n    "name": "app"\n}')).toBe(4);
    expect(detectIndent('{"name":"app"}')).toBe(2);

    const file = write(
      'package.json',
      '{\n  "dependencies": {\n    "@nextui-org/react": "1.0.0"\n  },\n  "devDependencies": {\n    "@nextui-org/theme": "1.0.0"\n  }\n}\n'
    );

    await migrateJson([file]);
    const migrated = JSON.parse(readFileSync(file, 'utf-8'));

    expect(migrated.dependencies['@heroui/react']).toBe('2.6.0');
    expect(migrated.devDependencies['@heroui/theme']).toBe('2.6.0');
    expect(fetchPackageLatestVersion).toHaveBeenCalled();
  });

  it('falls back to latest when the registry lookup fails', async () => {
    vi.mocked(fetchPackageLatestVersion).mockRejectedValueOnce(new Error('offline'));
    const file = write(
      'package.json',
      JSON.stringify({dependencies: {'@nextui-org/react': '1.0.0'}, devDependencies: {}})
    );

    await migrateJson([file]);
    expect(JSON.parse(readFileSync(file, 'utf-8')).dependencies['@heroui/react']).toBe('latest');
  });

  it('exits when migrating package.json throws', async () => {
    installExitMock();

    await expect(migrateJson([path.join(tmpdir(), 'missing-package.json')])).rejects.toBeInstanceOf(
      ExitError
    );
  });

  it('rewrites providers, css variables, npmrc, and leftover text', () => {
    const provider = write('provider.tsx', 'import {NextUIProvider} from "@nextui-org/react";');
    const css = write('theme.ts', 'const color = "var(--nextui-primary)";');
    const npmrc = write('.npmrc', '@nextui-org:registry=https://example.com');
    const leftover = write('notes.ts', 'see @nextui-org and nextui()');

    migrateNextuiProvider([provider]);
    migrateCssVariables([css]);
    migrateNpmrc([npmrc]);
    migrateLeftFiles([leftover]);

    expect(readFileSync(provider, 'utf-8')).toContain('HeroUIProvider');
    expect(readFileSync(css, 'utf-8')).toContain('--heroui-primary');
    expect(readFileSync(npmrc, 'utf-8')).toContain('@heroui:registry');
    expect(readFileSync(leftover, 'utf-8')).toContain('@heroui');
    expect(readFileSync(leftover, 'utf-8')).toContain('heroui()');
  });

  it('rewrites a tailwind config that still calls nextui', () => {
    const source = `const {nextui} = require("@nextui-org/theme");
module.exports = {content: ["./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"], plugins: [nextui()]};`;
    const file = write('tailwind.config.js', source);

    updateStore(file, 'parsedContent', parseContent(file));
    migrateTailwindcss([file]);

    const next = readFileSync(file, 'utf-8');

    expect(next).toContain('@heroui/theme');
    expect(next).toContain('heroui');
    expect(affectedFiles.has(file)).toBe(true);
  });
});
