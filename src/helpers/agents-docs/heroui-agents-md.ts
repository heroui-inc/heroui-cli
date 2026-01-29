/**
 * heroui-agents-md: Generate HeroUI documentation index for AI coding agents.
 *
 * Downloads docs from GitHub via git sparse-checkout, builds a compact
 * index of all doc files, and injects it into CLAUDE.md or AGENTS.md.
 *
 * This implementation is adapted from Next.js's agents-md tool:
 * https://github.com/vercel/next.js/tree/canary/packages/next-codemod/lib/agents-md.ts
 *
 * Portions of this code are based on work by Vercel, Inc.
 * Original Next.js code is licensed under the MIT License.
 */

import {execSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type DocSelection = 'react' | 'native' | 'both';

interface HerouiVersionsResult {
  react?: string;
  native?: string;
  error?: string;
}

export function getHerouiVersions(cwd: string): HerouiVersionsResult {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return {
      error: 'No package.json found in the current directory'
    };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const reactVersion = dependencies['@heroui/react'] || devDependencies['@heroui/react'];
    const nativeVersion = dependencies['heroui-native'] || devDependencies['heroui-native'];

    const result: HerouiVersionsResult = {};

    if (reactVersion) {
      result.react = reactVersion.replace(/^[<=>^~]+/, '');
    }

    if (nativeVersion) {
      result.native = nativeVersion.replace(/^[<=>^~]+/, '');
    }

    // If neither found, check for monorepo workspace
    if (!reactVersion && !nativeVersion) {
      const workspace = detectWorkspace(cwd);

      if (workspace.isMonorepo && workspace.packages.length > 0) {
        const versions = findHerouiInWorkspace(cwd, workspace.packages);

        if (versions.react) {
          result.react = versions.react;
        }
        if (versions.native) {
          result.native = versions.native;
        }

        if (!versions.react && !versions.native) {
          return {
            error: `No HeroUI packages found in ${workspace.type} workspace packages.`
          };
        }
      } else {
        return {
          error:
            'HeroUI packages (@heroui/react or heroui-native) are not installed in this project.'
        };
      }
    }

    return result;
  } catch (err) {
    return {
      error: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Default branch to use for docs.
 * Always uses the latest docs from the v3 branch.
 */
const DEFAULT_DOCS_BRANCH = 'v3';

interface PullOptions {
  cwd: string;
  docsDir?: string | undefined;
  selection: DocSelection;
  useSsh?: boolean | undefined;
}

interface PullResult {
  success: boolean;
  docsPath?: string | undefined;
  error?: string | undefined;
}

export async function pullDocs(options: PullOptions): Promise<PullResult> {
  const {cwd, docsDir, selection, useSsh} = options;

  // Always use the latest docs from the default branch
  const gitRef = DEFAULT_DOCS_BRANCH;

  const docsPath = docsDir ?? path.join(cwd, '.heroui-docs');

  try {
    // Ensure the docs directory exists (but don't remove it - preserve other libraries)
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, {recursive: true});
    }

    await cloneDocsFolder(gitRef, docsPath, selection, useSsh ?? false);

    return {
      docsPath,
      success: true
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      success: false
    };
  }
}

async function cloneDocsFolder(
  ref: string,
  destDir: string,
  selection: DocSelection,
  useSsh: boolean
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-agents-md-'));

  // Use SSH URL if flag is set, otherwise use HTTPS
  const repoUrl = useSsh
    ? 'git@github.com:heroui-inc/heroui.git'
    : 'https://github.com/heroui-inc/heroui.git';

  try {
    try {
      execSync(`git clone --depth 1 --filter=blob:none --sparse --branch ${ref} ${repoUrl} .`, {
        cwd: tempDir,
        stdio: 'pipe'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('not found') || message.includes('did not match')) {
        throw new Error(
          `Could not find documentation for HeroUI ${ref}. This branch/tag may not exist on GitHub.`
        );
      }
      throw error;
    }

    // Build sparse-checkout paths based on selection
    const sparsePaths: string[] = [];

    if (selection === 'react' || selection === 'both') {
      sparsePaths.push('apps/docs/content/docs/react');
    }
    if (selection === 'native' || selection === 'both') {
      sparsePaths.push('apps/docs/content/docs/native');
    }

    execSync(`git sparse-checkout set ${sparsePaths.join(' ')}`, {cwd: tempDir, stdio: 'pipe'});

    // Ensure destination directory exists (but don't remove it - preserve other libraries)
    fs.mkdirSync(destDir, {recursive: true});

    // Copy docs to destination - only update the selected library(ies)
    if (selection === 'react' || selection === 'both') {
      const sourceReactDir = path.join(tempDir, 'apps', 'docs', 'content', 'docs', 'react');

      if (fs.existsSync(sourceReactDir)) {
        const destReactDir = path.join(destDir, 'react');

        // Remove existing react docs directory to ensure clean update
        if (fs.existsSync(destReactDir)) {
          fs.rmSync(destReactDir, {recursive: true});
        }
        fs.mkdirSync(destReactDir, {recursive: true});
        fs.cpSync(sourceReactDir, destReactDir, {recursive: true});
      }
    }

    if (selection === 'native' || selection === 'both') {
      const sourceNativeDir = path.join(tempDir, 'apps', 'docs', 'content', 'docs', 'native');

      if (fs.existsSync(sourceNativeDir)) {
        const destNativeDir = path.join(destDir, 'native');

        // Remove existing native docs directory to ensure clean update
        if (fs.existsSync(destNativeDir)) {
          fs.rmSync(destNativeDir, {recursive: true});
        }
        fs.mkdirSync(destNativeDir, {recursive: true});
        fs.cpSync(sourceNativeDir, destNativeDir, {recursive: true});
      }
    }
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, {recursive: true});
    }
  }
}

export function collectDocFiles(dir: string): {relativePath: string}[] {
  return (fs.readdirSync(dir, {recursive: true}) as string[])
    .filter(
      (f) =>
        (f.endsWith('.mdx') || f.endsWith('.md')) &&
        !f.endsWith('/index.mdx') &&
        !f.endsWith('/index.md') &&
        !f.startsWith('index.')
    )
    .sort()
    .map((f) => ({relativePath: f}));
}

interface DocSection {
  name: string;
  files: {relativePath: string}[];
  subsections: DocSection[];
}

export function buildDocTree(files: {relativePath: string}[]): DocSection[] {
  const sections: Map<string, DocSection> = new Map();

  for (const file of files) {
    const parts = file.relativePath.split('/');

    if (parts.length < 2) continue;

    const topLevelDir = parts[0];

    if (!topLevelDir) continue;

    if (!sections.has(topLevelDir)) {
      sections.set(topLevelDir, {
        files: [],
        name: topLevelDir,
        subsections: []
      });
    }

    const section = sections.get(topLevelDir);

    if (!section) continue;

    if (parts.length === 2) {
      section.files.push({relativePath: file.relativePath});
    } else {
      const subsectionDir = parts[1];

      if (!subsectionDir) continue;

      let subsection = section.subsections.find((s) => s.name === subsectionDir);

      if (!subsection) {
        subsection = {files: [], name: subsectionDir, subsections: []};
        section.subsections.push(subsection);
      }

      if (parts.length === 3) {
        subsection.files.push({relativePath: file.relativePath});
      } else {
        const subSubDir = parts[2];

        if (!subSubDir) continue;

        let subSubsection = subsection.subsections.find((s) => s.name === subSubDir);

        if (!subSubsection) {
          subSubsection = {files: [], name: subSubDir, subsections: []};
          subsection.subsections.push(subSubsection);
        }

        subSubsection.files.push({relativePath: file.relativePath});
      }
    }
  }

  const sortedSections = Array.from(sections.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const section of sortedSections) {
    section.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    section.subsections.sort((a, b) => a.name.localeCompare(b.name));
    for (const subsection of section.subsections) {
      subsection.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      subsection.subsections.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return sortedSections;
}

interface HerouiMdIndexData {
  reactDocsPath?: string | undefined;
  nativeDocsPath?: string | undefined;
  reactSections?: DocSection[] | undefined;
  nativeSections?: DocSection[] | undefined;
  outputFile?: string | undefined;
  selection: DocSelection;
}

export function generateHerouiMdIndex(
  data: HerouiMdIndexData,
  library: 'react' | 'native'
): string {
  const {nativeDocsPath, nativeSections, outputFile, reactDocsPath, reactSections} = data;

  const parts: string[] = [];

  if (library === 'react') {
    parts.push('[HeroUI React Docs Index]');
    if (reactDocsPath) parts.push(`root: ${reactDocsPath}`);
    parts.push(
      'STOP. What you remember about HeroUI React is WRONG for this project. Always search docs and read before any task.'
    );

    const targetFile = outputFile || 'AGENTS.md';

    parts.push(
      `If docs missing, run this command first: heroui agents-md --react --output ${targetFile}`
    );

    if (reactSections) {
      const reactFiles = collectAllFilesFromSections(reactSections);
      const reactGrouped = groupByDirectory(reactFiles);

      for (const [dir, files] of reactGrouped) {
        parts.push(`${dir}:{${files.join(',')}}`);
      }
    }
  } else {
    parts.push('[HeroUI Native Docs Index]');
    if (nativeDocsPath) parts.push(`root: ${nativeDocsPath}`);
    parts.push(
      'STOP. What you remember about HeroUI Native is WRONG for this project. Always search docs and read before any task.'
    );

    const targetFile = outputFile || 'AGENTS.md';

    parts.push(
      `If docs missing, run this command first: heroui agents-md --native --output ${targetFile}`
    );

    if (nativeSections) {
      const nativeFiles = collectAllFilesFromSections(nativeSections);
      const nativeGrouped = groupByDirectory(nativeFiles);

      for (const [dir, files] of nativeGrouped) {
        parts.push(`${dir}:{${files.join(',')}}`);
      }
    }
  }

  return parts.join('|');
}

function collectAllFilesFromSections(sections: DocSection[]): string[] {
  const files: string[] = [];

  for (const section of sections) {
    for (const file of section.files) {
      files.push(file.relativePath);
    }
    files.push(...collectAllFilesFromSections(section.subsections));
  }

  return files;
}

function groupByDirectory(files: string[], prefix?: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const filePath of files) {
    const lastSlash = filePath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '.' : filePath.slice(0, lastSlash);
    const fileName = lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);

    const key = prefix ? `${prefix}/${dir}` : dir;

    const existing = grouped.get(key);

    if (existing) {
      existing.push(fileName);
    } else {
      grouped.set(key, [fileName]);
    }
  }

  return grouped;
}

const REACT_START_MARKER = '<!-- HEROUI-REACT-AGENTS-MD-START -->';
const REACT_END_MARKER = '<!-- HEROUI-REACT-AGENTS-MD-END -->';
const NATIVE_START_MARKER = '<!-- HEROUI-NATIVE-AGENTS-MD-START -->';
const NATIVE_END_MARKER = '<!-- HEROUI-NATIVE-AGENTS-MD-END -->';

function getMarkers(library: 'react' | 'native'): {start: string; end: string} {
  if (library === 'react') {
    return {end: REACT_END_MARKER, start: REACT_START_MARKER};
  }

  return {end: NATIVE_END_MARKER, start: NATIVE_START_MARKER};
}

function hasExistingIndex(content: string, library: 'react' | 'native'): boolean {
  const {start} = getMarkers(library);

  return content.includes(start);
}

function wrapWithMarkers(content: string, library: 'react' | 'native'): string {
  const {end, start} = getMarkers(library);

  return `${start}\n${content}\n${end}`;
}

function injectSection(
  content: string,
  sectionContent: string,
  library: 'react' | 'native'
): string {
  const {end, start} = getMarkers(library);
  const wrappedContent = wrapWithMarkers(sectionContent, library);

  if (hasExistingIndex(content, library)) {
    const startIdx = content.indexOf(start);
    const endIdx = content.indexOf(end) + end.length;

    return content.slice(0, startIdx) + wrappedContent + content.slice(endIdx);
  }

  // If section doesn't exist, append it
  const separator = content.endsWith('\n') ? '\n' : '\n\n';

  return content + separator + wrappedContent + '\n';
}

export function injectIntoClaudeMd(
  claudeMdContent: string,
  reactIndexContent: string | undefined,
  nativeIndexContent: string | undefined
): string {
  let result = claudeMdContent;

  // Inject React section if provided
  if (reactIndexContent !== undefined) {
    result = injectSection(result, reactIndexContent, 'react');
  }

  // Inject Native section if provided
  if (nativeIndexContent !== undefined) {
    result = injectSection(result, nativeIndexContent, 'native');
  }

  return result;
}

interface GitignoreStatus {
  path: string;
  updated: boolean;
  alreadyPresent: boolean;
}

const GITIGNORE_ENTRY = '.heroui-docs/';

export function ensureGitignoreEntry(cwd: string): GitignoreStatus {
  const gitignorePath = path.join(cwd, '.gitignore');
  const entryRegex = /^\s*\.heroui-docs(?:\/.*)?$/;

  let content = '';

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const hasEntry = content.split(/\r?\n/).some((line) => entryRegex.test(line));

  if (hasEntry) {
    return {alreadyPresent: true, path: gitignorePath, updated: false};
  }

  const needsNewline = content.length > 0 && !content.endsWith('\n');
  const header = content.includes('# heroui-agents-md') ? '' : '# heroui-agents-md\n';
  const newContent = content + (needsNewline ? '\n' : '') + header + `${GITIGNORE_ENTRY}\n`;

  fs.writeFileSync(gitignorePath, newContent, 'utf-8');

  return {alreadyPresent: false, path: gitignorePath, updated: true};
}

type WorkspaceType = 'pnpm' | 'npm' | 'yarn' | 'nx' | 'lerna' | null;

interface WorkspaceInfo {
  isMonorepo: boolean;
  type: WorkspaceType;
  packages: string[];
}

function detectWorkspace(cwd: string): WorkspaceInfo {
  const packageJsonPath = path.join(cwd, 'package.json');

  // Check pnpm workspaces (pnpm-workspace.yaml)
  const pnpmWorkspacePath = path.join(cwd, 'pnpm-workspace.yaml');

  if (fs.existsSync(pnpmWorkspacePath)) {
    const packages = parsePnpmWorkspace(pnpmWorkspacePath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'pnpm'};
    }
  }

  // Check npm/yarn workspaces (package.json workspaces field)
  if (fs.existsSync(packageJsonPath)) {
    const packages = parsePackageJsonWorkspaces(packageJsonPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'npm'};
    }
  }

  // Check Lerna (lerna.json)
  const lernaPath = path.join(cwd, 'lerna.json');

  if (fs.existsSync(lernaPath)) {
    const packages = parseLernaConfig(lernaPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'lerna'};
    }
  }

  // Check Nx (nx.json)
  const nxPath = path.join(cwd, 'nx.json');

  if (fs.existsSync(nxPath)) {
    const packages = parseNxWorkspace(cwd, packageJsonPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'nx'};
    }
  }

  return {isMonorepo: false, packages: [], type: null};
}

function parsePnpmWorkspace(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const packages: string[] = [];
    let inPackages = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'packages:') {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
          break;
        }
        const match = trimmed.match(/^-\s*["']?([^"']+)["']?$/);

        if (match && match[1]) {
          packages.push(match[1]);
        }
      }
    }

    return packages;
  } catch {
    return [];
  }
}

function parsePackageJsonWorkspaces(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content);

    if (Array.isArray(pkg.workspaces)) {
      return pkg.workspaces;
    }
    if (pkg.workspaces?.packages && Array.isArray(pkg.workspaces.packages)) {
      return pkg.workspaces.packages;
    }

    return [];
  } catch {
    return [];
  }
}

function parseLernaConfig(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    if (Array.isArray(config.packages)) {
      return config.packages;
    }

    return ['packages/*'];
  } catch {
    return [];
  }
}

function parseNxWorkspace(cwd: string, packageJsonPath: string): string[] {
  if (fs.existsSync(packageJsonPath)) {
    const packages = parsePackageJsonWorkspaces(packageJsonPath);

    if (packages.length > 0) {
      return packages;
    }
  }
  const defaultPatterns = ['apps/*', 'libs/*', 'packages/*'];
  const existingPatterns: string[] = [];

  for (const pattern of defaultPatterns) {
    const basePath = path.join(cwd, pattern.replace('/*', ''));

    if (fs.existsSync(basePath)) {
      existingPatterns.push(pattern);
    }
  }

  return existingPatterns;
}

function findHerouiInWorkspace(cwd: string, patterns: string[]): {react?: string; native?: string} {
  const packagePaths = expandWorkspacePatterns(cwd, patterns);
  const reactVersions: string[] = [];
  const nativeVersions: string[] = [];

  for (const pkgPath of packagePaths) {
    const packageJsonPath = path.join(pkgPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) continue;

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const reactVersion =
        pkg.dependencies?.['@heroui/react'] || pkg.devDependencies?.['@heroui/react'];
      const nativeVersion =
        pkg.dependencies?.['heroui-native'] || pkg.devDependencies?.['heroui-native'];

      if (reactVersion) {
        reactVersions.push(reactVersion.replace(/^[<=>^~]+/, ''));
      }
      if (nativeVersion) {
        nativeVersions.push(nativeVersion.replace(/^[<=>^~]+/, ''));
      }
    } catch {
      // Skip invalid package.json
    }
  }

  const nativeVersion = findHighestVersion(nativeVersions);
  const reactVersion = findHighestVersion(reactVersions);

  return {
    ...(nativeVersion ? {native: nativeVersion} : {}),
    ...(reactVersion ? {react: reactVersion} : {})
  };
}

function expandWorkspacePatterns(cwd: string, patterns: string[]): string[] {
  const packagePaths: string[] = [];

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;

    if (pattern.includes('*')) {
      packagePaths.push(...expandGlobPattern(cwd, pattern));
    } else {
      const fullPath = path.join(cwd, pattern);

      if (fs.existsSync(fullPath)) {
        packagePaths.push(fullPath);
      }
    }
  }

  return [...new Set(packagePaths)];
}

function expandGlobPattern(cwd: string, pattern: string): string[] {
  const parts = pattern.split('/');
  const results: string[] = [];

  function walk(currentPath: string, partIndex: number): void {
    if (partIndex >= parts.length) {
      if (fs.existsSync(path.join(currentPath, 'package.json'))) {
        results.push(currentPath);
      }

      return;
    }

    const part = parts[partIndex];

    if (!part) return;

    if (part === '*') {
      if (!fs.existsSync(currentPath)) return;
      try {
        for (const entry of fs.readdirSync(currentPath)) {
          const fullPath = path.join(currentPath, entry);

          if (isDirectory(fullPath)) {
            if (partIndex === parts.length - 1) {
              if (fs.existsSync(path.join(fullPath, 'package.json'))) {
                results.push(fullPath);
              }
            } else {
              walk(fullPath, partIndex + 1);
            }
          }
        }
      } catch {
        // Permission denied
      }
    } else if (part === '**') {
      walkRecursive(currentPath, results);
    } else {
      walk(path.join(currentPath, part), partIndex + 1);
    }
  }

  walk(cwd, 0);

  return results;
}

function walkRecursive(dir: string, results: string[]): void {
  if (!fs.existsSync(dir)) return;

  if (fs.existsSync(path.join(dir, 'package.json'))) {
    results.push(dir);
  }

  try {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const fullPath = path.join(dir, entry);

      if (isDirectory(fullPath)) {
        walkRecursive(fullPath, results);
      }
    }
  } catch {
    // Permission denied
  }
}

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function findHighestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0] ?? null;

  return versions.reduce((highest, current) => {
    if (!highest) return current ?? null;
    if (!current) return highest;

    return compareVersions(current, highest) > 0 ? current : highest;
  });
}

function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): [number, number, number] => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (!match) return [0, 0, 0];

    return [
      parseInt(match[1] ?? '0', 10),
      parseInt(match[2] ?? '0', 10),
      parseInt(match[3] ?? '0', 10)
    ];
  };

  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;

  return aPatch - bPatch;
}
