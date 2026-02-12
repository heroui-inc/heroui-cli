import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

    it('returns empty array when dir does not exist', () => {
      tmpDir = path.join(os.tmpdir(), 'heroui-agents-md-nonexistent-' + Date.now());
      expect(collectDemoFiles(tmpDir)).toEqual([]);
    });
  });
});
