import type {DocSelection} from '@helpers/agents-docs/heroui-agents-md';
import type {DocsOptions} from '@helpers/type';

import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

import {
  buildDocTree,
  collectDocFiles,
  ensureGitignoreEntry,
  generateHerouiMdIndex,
  injectIntoClaudeMd,
  pullDocs
} from '@helpers/agents-docs/heroui-agents-md';
import {ValidationError} from '@helpers/errors';
import {Logger} from '@helpers/logger';
import {getSelect, getText} from 'src/prompts';

const DOCS_DIR_NAME = '.heroui-docs';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;

  return `${mb.toFixed(1)} MB`;
}

export async function docsAction(options: DocsOptions) {
  const cwd = process.cwd();

  // Mode logic:
  // 1. No flags → interactive mode (prompts for selection + target file)
  // 2. Library flags (--react, --native, --both) → use that selection, prompt for output file if --output not provided
  // 3. --output alone → prompt for library selection, use provided output file

  let selection: DocSelection;
  let targetFile: string | undefined;

  // Determine selection from flags
  if (options.react && options.native) {
    selection = 'both';
  } else if (options.react) {
    selection = 'react';
  } else if (options.native) {
    selection = 'native';
  } else if (options.output) {
    // If only --output provided, prompt for library selection
    selection = await promptForLibrarySelection();
  } else {
    // Full interactive mode - prompts for both selection and target file
    const promptedOptions = await promptForOptions();

    selection = promptedOptions.selection;
    targetFile = promptedOptions.targetFile;
  }

  // Set targetFile from options.output if provided
  if (options.output) {
    targetFile = options.output;
  }

  // If output file not provided, prompt for it
  if (!targetFile) {
    const promptedFile = await promptForOutputFile();

    if (promptedFile) {
      targetFile = promptedFile;
    } else {
      targetFile = 'AGENTS.md';
    }
  }

  const claudeMdPath = path.join(cwd, targetFile);
  const docsPath = path.join(cwd, DOCS_DIR_NAME);

  let sizeBefore = 0;
  let isNewFile = true;
  let existingContent = '';

  if (fs.existsSync(claudeMdPath)) {
    existingContent = fs.readFileSync(claudeMdPath, 'utf-8');
    sizeBefore = Buffer.byteLength(existingContent, 'utf-8');
    isNewFile = false;
  }

  const selectionText =
    selection === 'both' ? 'React and Native' : selection === 'react' ? 'React' : 'Native';

  Logger.log(
    `\nDownloading HeroUI ${selectionText} documentation to ${chalk.cyan(DOCS_DIR_NAME)}...`
  );

  const pullResult = await pullDocs({
    cwd,
    docsDir: docsPath,
    selection,
    useSsh: options.ssh ?? false
  });

  if (!pullResult.success) {
    throw new ValidationError(`Failed to pull docs: ${pullResult.error}`);
  }

  // Collect and build trees for selected docs
  let reactSections: ReturnType<typeof buildDocTree> | undefined;
  let nativeSections: ReturnType<typeof buildDocTree> | undefined;

  if (selection === 'react' || selection === 'both') {
    const reactDocsPath = path.join(docsPath, 'react');

    if (fs.existsSync(reactDocsPath)) {
      const reactDocFiles = collectDocFiles(reactDocsPath);

      reactSections = buildDocTree(reactDocFiles);
    }
  }

  if (selection === 'native' || selection === 'both') {
    const nativeDocsPath = path.join(docsPath, 'native');

    if (fs.existsSync(nativeDocsPath)) {
      const nativeDocFiles = collectDocFiles(nativeDocsPath);

      nativeSections = buildDocTree(nativeDocFiles);
    }
  }

  const reactDocsLinkPath =
    selection === 'react' || selection === 'both' ? `./${DOCS_DIR_NAME}/react` : undefined;
  const nativeDocsLinkPath =
    selection === 'native' || selection === 'both' ? `./${DOCS_DIR_NAME}/native` : undefined;

  const indexData: Parameters<typeof generateHerouiMdIndex>[0] = {
    outputFile: targetFile,
    selection
  };

  if (nativeDocsLinkPath) indexData.nativeDocsPath = nativeDocsLinkPath;
  if (nativeSections) indexData.nativeSections = nativeSections;
  if (reactDocsLinkPath) indexData.reactDocsPath = reactDocsLinkPath;
  if (reactSections) indexData.reactSections = reactSections;

  // Generate separate index content for React and Native
  const reactIndexContent =
    selection === 'react' || selection === 'both'
      ? generateHerouiMdIndex(indexData, 'react')
      : undefined;
  const nativeIndexContent =
    selection === 'native' || selection === 'both'
      ? generateHerouiMdIndex(indexData, 'native')
      : undefined;

  const newContent = injectIntoClaudeMd(existingContent, reactIndexContent, nativeIndexContent);

  fs.writeFileSync(claudeMdPath, newContent, 'utf-8');

  const sizeAfter = Buffer.byteLength(newContent, 'utf-8');

  const gitignoreResult = ensureGitignoreEntry(cwd);

  const action = isNewFile ? 'Created' : 'Updated';
  const sizeInfo = isNewFile
    ? formatSize(sizeAfter)
    : `${formatSize(sizeBefore)} → ${formatSize(sizeAfter)}`;

  Logger.success(`✓ ${action} ${chalk.bold(targetFile)} (${sizeInfo})`);
  if (gitignoreResult.updated) {
    Logger.success(`✓ Added ${chalk.bold(DOCS_DIR_NAME)} to .gitignore`);
  }
  Logger.newLine();

  process.exit(0);
}

async function promptForLibrarySelection(): Promise<DocSelection> {
  const selection = await getSelect('Select docs to include', [
    {title: 'React', value: 'react'},
    {title: 'Native', value: 'native'},
    {title: 'Both', value: 'both'}
  ]);

  if (selection === undefined) {
    Logger.warn('\nCancelled.');
    process.exit(0);
  }

  return selection as DocSelection;
}

async function promptForOptions(): Promise<{
  selection: DocSelection;
  targetFile: string;
}> {
  Logger.log(chalk.cyan('\nheroui agents-md - HeroUI Documentation for AI Agents\n'));
  Logger.grey(`Note: Only the latest docs will be downloaded\n`);

  const selection = await promptForLibrarySelection();
  const targetFile = await promptForOutputFile();

  return {
    selection,
    targetFile
  };
}

async function promptForOutputFile(): Promise<string> {
  const targetFileSelect = await getSelect('Target markdown file', [
    {title: 'AGENTS.md', value: 'AGENTS.md'},
    {title: 'CLAUDE.md', value: 'CLAUDE.md'},
    {title: 'Custom...', value: '__custom__'}
  ]);

  if (targetFileSelect === undefined) {
    Logger.warn('\nCancelled.');
    process.exit(0);
  }

  let targetFile = targetFileSelect;

  if (targetFile === '__custom__') {
    const customFile = await getText('Enter custom file path', 'AGENTS.md');

    if (customFile === undefined || !customFile.trim()) {
      Logger.warn('\nCancelled.');
      process.exit(0);
    }

    targetFile = customFile.trim();
  }

  return targetFile;
}
