import type {DocSelection} from './heroui-agents-md';

import fs from 'node:fs';
import path from 'node:path';

import {type DocSection, collectAllFilesFromSections, groupByDirectory} from './doc-tree';

export interface HerouiMdIndexData {
  reactDocsPath?: string | undefined;
  nativeDocsPath?: string | undefined;
  migrationDocsPath?: string | undefined;
  reactSections?: DocSection[] | undefined;
  nativeSections?: DocSection[] | undefined;
  migrationSections?: DocSection[] | undefined;
  reactDemoFiles?: {relativePath: string}[] | undefined;
  outputFile?: string | undefined;
  selection: DocSelection;
}

export function generateHerouiMdIndex(
  data: HerouiMdIndexData,
  library: 'react' | 'native' | 'migration'
): string {
  const {
    migrationDocsPath,
    migrationSections,
    nativeDocsPath,
    nativeSections,
    outputFile,
    reactDemoFiles,
    reactDocsPath,
    reactSections
  } = data;

  const parts: string[] = [];

  if (library === 'react') {
    parts.push('[HeroUI React v3 Docs Index]');
    if (reactDocsPath) parts.push(`root: ${reactDocsPath}`);
    parts.push(
      'STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.'
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

    if (reactDemoFiles && reactDemoFiles.length > 0) {
      const demoFilePaths = reactDemoFiles.map((f) => f.relativePath);
      const demoGrouped = groupByDirectory(demoFilePaths, 'demos');

      for (const [dir, files] of demoGrouped) {
        parts.push(`${dir}:{${files.join(',')}}`);
      }
    }
  } else if (library === 'native') {
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
  } else {
    parts.push('[HeroUI Migration Docs Index]');
    if (migrationDocsPath) parts.push(`root: ${migrationDocsPath}`);
    parts.push(
      'STOP. Always search migration docs before migrating components from HeroUI v2 to v3.'
    );
    parts.push('Start with: agent-index.mdx, then follow the workflow and component guides.');

    const targetFile = outputFile || 'AGENTS.md';

    parts.push(
      `If docs missing, run this command first: heroui agents-md --migration --output ${targetFile}`
    );

    if (migrationSections) {
      const migrationFiles = collectAllFilesFromSections(migrationSections);
      const migrationGrouped = groupByDirectory(migrationFiles);

      for (const [dir, files] of migrationGrouped) {
        parts.push(`${dir}:{${files.join(',')}}`);
      }
    }
  }

  return parts.join('|');
}

const REACT_START_MARKER = '<!-- HEROUI-REACT-AGENTS-MD-START -->';
const REACT_END_MARKER = '<!-- HEROUI-REACT-AGENTS-MD-END -->';
const NATIVE_START_MARKER = '<!-- HEROUI-NATIVE-AGENTS-MD-START -->';
const NATIVE_END_MARKER = '<!-- HEROUI-NATIVE-AGENTS-MD-END -->';
const MIGRATION_START_MARKER = '<!-- HEROUI-MIGRATION-AGENTS-MD-START -->';
const MIGRATION_END_MARKER = '<!-- HEROUI-MIGRATION-AGENTS-MD-END -->';

function getMarkers(library: 'react' | 'native' | 'migration'): {start: string; end: string} {
  if (library === 'react') {
    return {end: REACT_END_MARKER, start: REACT_START_MARKER};
  }
  if (library === 'native') {
    return {end: NATIVE_END_MARKER, start: NATIVE_START_MARKER};
  }

  return {end: MIGRATION_END_MARKER, start: MIGRATION_START_MARKER};
}

function hasExistingIndex(content: string, library: 'react' | 'native' | 'migration'): boolean {
  const {start} = getMarkers(library);

  return content.includes(start);
}

function wrapWithMarkers(content: string, library: 'react' | 'native' | 'migration'): string {
  const {end, start} = getMarkers(library);

  return `${start}\n${content}\n${end}`;
}

function injectSection(
  content: string,
  sectionContent: string,
  library: 'react' | 'native' | 'migration'
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
  nativeIndexContent: string | undefined,
  migrationIndexContent?: string | undefined
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

  // Inject Migration section if provided
  if (migrationIndexContent !== undefined) {
    result = injectSection(result, migrationIndexContent, 'migration');
  }

  return result;
}

export interface GitignoreStatus {
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
