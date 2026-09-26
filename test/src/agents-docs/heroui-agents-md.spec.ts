import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {collectAllFilesFromSections, groupByDirectory} from '@helpers/agents-docs/doc-tree';
import {
  buildDocTree,
  collectDemoFiles,
  collectDocFiles,
  collectMigrationDocFiles,
  ensureGitignoreEntry,
  generateHerouiMdIndex,
  getHerouiVersions,
  injectIntoClaudeMd
} from '@helpers/agents-docs/heroui-agents-md';
import {afterEach, describe, expect, it} from 'vitest';

describe('heroui-agents-md', () => {
  describe('buildDocTree', () => {
    it('groups files by directory and sorts sections and files', () => {
      const files = [{relativePath: 'b.mdx'}, {relativePath: 'a.mdx'}, {relativePath: 'sub/c.mdx'}];
      const tree = buildDocTree(files);

      expect(tree).toHaveLength(2);
      const root = tree.find((s) => s.name === '.');
      const sub = tree.find((s) => s.name === 'sub');

      expect(root?.files.map((f) => f.relativePath)).toEqual(['a.mdx', 'b.mdx']);
      expect(sub?.files.map((f) => f.relativePath)).toEqual(['sub/c.mdx']);
    });

    it('returns empty array for empty input', () => {
      expect(buildDocTree([])).toEqual([]);
    });

    it('uses the full directory path as a flat section', () => {
      const tree = buildDocTree([{relativePath: 'a/b/c.mdx'}, {relativePath: 'a/b/d.mdx'}]);

      expect(tree.map((section) => section.name)).toEqual(['a/b']);
      expect(tree[0]?.subsections).toEqual([]);
      expect(collectAllFilesFromSections(tree)).toEqual(['a/b/c.mdx', 'a/b/d.mdx']);
      expect(groupByDirectory(['a/b.mdx', 'c.mdx'], 'demos').get('demos/a')).toEqual(['b.mdx']);
      expect(groupByDirectory(['a/b.mdx', 'c.mdx'], 'demos').get('demos/.')).toEqual(['c.mdx']);
      expect(groupByDirectory(['a/b.mdx']).get('a')).toEqual(['b.mdx']);
    });
  });

  describe('generateHerouiMdIndex', () => {
    it('generates migration index with root and start hint', () => {
      const data = {
        migrationDocsPath: './.heroui-docs/migration',
        migrationSections: buildDocTree([
          {relativePath: 'agent-index.mdx'},
          {relativePath: 'hooks.mdx'}
        ]),
        selection: 'migration' as const
      };
      const out = generateHerouiMdIndex(data, 'migration');

      expect(out).toContain('[HeroUI Migration Docs Index]');
      expect(out).toContain('root: ./.heroui-docs/migration');
      expect(out).toContain('Start with: agent-index.mdx');
      expect(out).toContain('.:{agent-index.mdx,hooks.mdx}');
      expect(out).toContain('heroui agents-md --migration');
    });

    it('generates react index with sections and run command', () => {
      const data = {
        reactDocsPath: './.heroui-docs/react',
        reactSections: buildDocTree([{relativePath: 'getting-started.mdx'}]),
        selection: 'react' as const
      };
      const out = generateHerouiMdIndex(data, 'react');

      expect(out).toContain('[HeroUI React v3 Docs Index]');
      expect(out).toContain('root: ./.heroui-docs/react');
      expect(out).toContain('getting-started.mdx');
      expect(out).toContain('heroui agents-md --react');
    });

    it('generates native index when library is native', () => {
      const data = {
        nativeDocsPath: './.heroui-docs/native',
        nativeSections: buildDocTree([{relativePath: 'intro.mdx'}]),
        selection: 'native' as const
      };
      const out = generateHerouiMdIndex(data, 'native');

      expect(out).toContain('[HeroUI Native Docs Index]');
      expect(out).toContain('root: ./.heroui-docs/native');
      expect(out).toContain('heroui agents-md --native');
    });

    it('uses custom output file in run command when provided', () => {
      const data = {
        migrationDocsPath: './.heroui-docs/migration',
        outputFile: 'CLAUDE.md',
        selection: 'migration' as const
      };
      const out = generateHerouiMdIndex(data, 'migration');

      expect(out).toContain('heroui agents-md --migration --output CLAUDE.md');
    });

    it('lists react demo files under a demos prefix', () => {
      const data = {
        reactDemoFiles: [{relativePath: 'button.tsx'}],
        reactDocsPath: './.heroui-docs/react',
        reactSections: buildDocTree([{relativePath: 'getting-started.mdx'}]),
        selection: 'react' as const
      };
      const out = generateHerouiMdIndex(data, 'react');

      expect(out).toContain('.:{getting-started.mdx}');
      expect(out).toContain('demos/.:{button.tsx}');
    });
  });

  describe('injectIntoClaudeMd', () => {
    it('appends migration block when content has no existing block', () => {
      const content = '# My project\n';
      const out = injectIntoClaudeMd(content, undefined, undefined, 'migration-index');

      expect(out).toContain('<!-- HEROUI-MIGRATION-AGENTS-MD-START -->');
      expect(out).toContain('migration-index');
      expect(out).toContain('<!-- HEROUI-MIGRATION-AGENTS-MD-END -->');
      expect(out).toContain('# My project');
    });

    it('replaces existing migration block when present', () => {
      const content =
        'pre\n<!-- HEROUI-MIGRATION-AGENTS-MD-START -->\nold\n<!-- HEROUI-MIGRATION-AGENTS-MD-END -->\npost';
      const out = injectIntoClaudeMd(content, undefined, undefined, 'new-migration');

      expect(out).toContain('pre');
      expect(out).toContain('post');
      expect(out).toContain('new-migration');
      expect(out).not.toContain('old');
    });

    it('injects react and migration when both provided', () => {
      const content = '';
      const out = injectIntoClaudeMd(content, 'react-index', undefined, 'migration-index');

      expect(out).toContain('<!-- HEROUI-REACT-AGENTS-MD-START -->');
      expect(out).toContain('react-index');
      expect(out).toContain('<!-- HEROUI-MIGRATION-AGENTS-MD-START -->');
      expect(out).toContain('migration-index');
    });

    it('leaves content unchanged when all index contents are undefined', () => {
      const content = '# Only this';
      const out = injectIntoClaudeMd(content, undefined, undefined, undefined);

      expect(out).toBe('# Only this');
    });

    it('injects a native block', () => {
      const out = injectIntoClaudeMd('# Project\n', undefined, 'native-index', undefined);

      expect(out).toContain('<!-- HEROUI-NATIVE-AGENTS-MD-START -->');
      expect(out).toContain('native-index');
      expect(out).toContain('<!-- HEROUI-NATIVE-AGENTS-MD-END -->');
    });

    it('appends a fresh block when the end marker is missing', () => {
      const content = 'pre\n<!-- HEROUI-MIGRATION-AGENTS-MD-START -->\nold';
      const out = injectIntoClaudeMd(content, undefined, undefined, 'new-migration');

      expect(out).toContain('pre');
      expect(out).toContain('old');
      expect(out).toContain('new-migration');
      expect(out.endsWith('<!-- HEROUI-MIGRATION-AGENTS-MD-END -->\n')).toBe(true);
    });
  });

  describe('ensureGitignoreEntry', () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, {recursive: true});
      }
    });

    it('adds .heroui-docs/ to new .gitignore and returns updated', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      const result = ensureGitignoreEntry(tmpDir);

      expect(result.updated).toBe(true);
      expect(result.alreadyPresent).toBe(false);
      expect(result.path).toBe(path.join(tmpDir, '.gitignore'));
      expect(fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8')).toContain('.heroui-docs/');
    });

    it('does not duplicate when entry already present', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.heroui-docs/\n', 'utf-8');
      const result = ensureGitignoreEntry(tmpDir);

      expect(result.updated).toBe(false);
      expect(result.alreadyPresent).toBe(true);
      expect(fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8')).toBe('.heroui-docs/\n');
    });

    it('recognizes .heroui-docs with trailing path as present', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.heroui-docs\n', 'utf-8');
      const result = ensureGitignoreEntry(tmpDir);

      expect(result.alreadyPresent).toBe(true);
      expect(result.updated).toBe(false);
    });

    it('appends the entry and a header when the file has no trailing newline', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules', 'utf-8');
      const result = ensureGitignoreEntry(tmpDir);

      expect(result.updated).toBe(true);
      expect(fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8')).toBe(
        'node_modules\n# heroui-agents-md\n.heroui-docs/\n'
      );
    });
  });

  describe('getHerouiVersions', () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, {recursive: true});
      }
    });

    it('returns react version from dependencies', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({dependencies: {'@heroui/react': '^2.0.0'}}),
        'utf-8'
      );
      const result = getHerouiVersions(tmpDir);

      expect(result.react).toBe('2.0.0');
      expect(result.error).toBeUndefined();
    });

    it('returns react version from devDependencies', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({devDependencies: {'@heroui/react': '3.0.0'}}),
        'utf-8'
      );
      const result = getHerouiVersions(tmpDir);

      expect(result.react).toBe('3.0.0');
    });

    it('returns error when no package.json', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      const result = getHerouiVersions(tmpDir);

      expect(result.error).toContain('No package.json');
    });

    it('strips a leading range from the react version', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({dependencies: {'@heroui/react': '>=2.4.0', 'heroui-native': '^1.2.0'}}),
        'utf-8'
      );

      expect(getHerouiVersions(tmpDir)).toMatchObject({native: '1.2.0', react: '2.4.0'});
    });

    it('returns a parse error for invalid package.json', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{', 'utf-8');

      expect(getHerouiVersions(tmpDir).error).toContain('Failed to parse package.json');
    });

    it('picks the highest version in a pnpm workspace', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({name: 'root'}), 'utf-8');
      fs.writeFileSync(
        path.join(tmpDir, 'pnpm-workspace.yaml'),
        'packages: ["packages/*"]\n',
        'utf-8'
      );
      fs.mkdirSync(path.join(tmpDir, 'packages', 'a'), {recursive: true});
      fs.mkdirSync(path.join(tmpDir, 'packages', 'b'), {recursive: true});
      fs.writeFileSync(
        path.join(tmpDir, 'packages', 'a', 'package.json'),
        JSON.stringify({dependencies: {'@heroui/react': '2.0.0'}}),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'packages', 'b', 'package.json'),
        JSON.stringify({dependencies: {'@heroui/react': '3.1.0', 'heroui-native': '1.0.0'}}),
        'utf-8'
      );

      expect(getHerouiVersions(tmpDir)).toMatchObject({native: '1.0.0', react: '3.1.0'});
    });

    it('names the workspace type when no HeroUI package is installed', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({workspaces: ['packages/*']}),
        'utf-8'
      );
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '', 'utf-8');
      fs.mkdirSync(path.join(tmpDir, 'packages', 'web'), {recursive: true});
      fs.writeFileSync(
        path.join(tmpDir, 'packages', 'web', 'package.json'),
        JSON.stringify({dependencies: {react: '19.0.0'}}),
        'utf-8'
      );

      expect(getHerouiVersions(tmpDir).error).toContain('yarn workspace');
    });

    it('reads an npm workspace when yarn.lock is absent', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({workspaces: {packages: ['packages/*']}}),
        'utf-8'
      );
      fs.mkdirSync(path.join(tmpDir, 'packages', 'web'), {recursive: true});
      fs.writeFileSync(
        path.join(tmpDir, 'packages', 'web', 'package.json'),
        JSON.stringify({devDependencies: {'@heroui/react': '~3.0.1'}}),
        'utf-8'
      );

      expect(getHerouiVersions(tmpDir).react).toBe('3.0.1');
    });

    it('reads lerna and nx workspaces', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({name: 'root'}), 'utf-8');
      fs.writeFileSync(
        path.join(tmpDir, 'lerna.json'),
        JSON.stringify({packages: ['packages/*']}),
        'utf-8'
      );
      fs.mkdirSync(path.join(tmpDir, 'packages', 'web'), {recursive: true});
      fs.writeFileSync(
        path.join(tmpDir, 'packages', 'web', 'package.json'),
        JSON.stringify({dependencies: {'heroui-native': '2.0.0'}}),
        'utf-8'
      );

      expect(getHerouiVersions(tmpDir).native).toBe('2.0.0');

      const nxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));

      fs.writeFileSync(
        path.join(nxDir, 'package.json'),
        JSON.stringify({name: 'nx-root'}),
        'utf-8'
      );
      fs.writeFileSync(path.join(nxDir, 'nx.json'), '{}', 'utf-8');
      fs.mkdirSync(path.join(nxDir, 'apps', 'web'), {recursive: true});
      fs.writeFileSync(
        path.join(nxDir, 'apps', 'web', 'package.json'),
        JSON.stringify({dependencies: {'@heroui/react': '3.4.0'}}),
        'utf-8'
      );

      expect(getHerouiVersions(nxDir).react).toBe('3.4.0');
      fs.rmSync(nxDir, {recursive: true});
    });

    it('returns error when no HeroUI packages in simple project', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({dependencies: {react: '18.0.0'}}),
        'utf-8'
      );
      const result = getHerouiVersions(tmpDir);

      expect(result.error).toContain('not installed');
    });
  });

  describe('collectDocFiles', () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, {recursive: true});
      }
    });

    it('returns mdx and md files and excludes index files', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'page.mdx'), '', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'notes.txt'), '', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'index.mdx'), '', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'other.md'), '', 'utf-8');
      fs.mkdirSync(path.join(tmpDir, 'sub'), {recursive: true});
      fs.writeFileSync(path.join(tmpDir, 'sub', 'nested.mdx'), '', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'sub', 'index.md'), '', 'utf-8');

      const files = collectDocFiles(tmpDir);

      const paths = files.map((f) => f.relativePath).sort();

      expect(paths).toContain('page.mdx');
      expect(paths).toContain('other.md');
      expect(paths).toContain('sub/nested.mdx');
      expect(paths).not.toContain('index.mdx');
      expect(paths).not.toContain('sub/index.md');
      expect(paths).not.toContain('notes.txt');
    });

    it('throws when the directory does not exist', () => {
      expect(() => collectDocFiles(path.join(os.tmpdir(), 'heroui-missing-docs'))).toThrow();
    });
  });

  describe('collectMigrationDocFiles', () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, {recursive: true});
      }
    });

    it('returns all mdx and md files including index', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'index.mdx'), '', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'hooks.mdx'), '', 'utf-8');

      const files = collectMigrationDocFiles(tmpDir);

      const paths = files.map((f) => f.relativePath).sort();

      expect(paths).toContain('index.mdx');
      expect(paths).toContain('hooks.mdx');
    });
  });

  describe('collectDemoFiles', () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, {recursive: true});
      }
    });

    it('returns tsx files excluding path ending with /index.tsx', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'button.tsx'), '', 'utf-8');
      fs.mkdirSync(path.join(tmpDir, 'sub'), {recursive: true});
      fs.writeFileSync(path.join(tmpDir, 'sub', 'index.tsx'), '', 'utf-8');

      const files = collectDemoFiles(tmpDir);

      const paths = files.map((f) => f.relativePath).sort();

      expect(paths).toContain('button.tsx');
      expect(paths).not.toContain('sub/index.tsx');
    });

    it('keeps a root index.tsx because only nested index files are excluded', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-test-'));
      fs.writeFileSync(path.join(tmpDir, 'index.tsx'), '', 'utf-8');

      expect(collectDemoFiles(tmpDir).map((file) => file.relativePath)).toEqual(['index.tsx']);
    });

    it('returns empty array when dir does not exist', () => {
      tmpDir = path.join(os.tmpdir(), 'heroui-agents-md-nonexistent-' + Date.now());
      expect(collectDemoFiles(tmpDir)).toEqual([]);
    });
  });
});
