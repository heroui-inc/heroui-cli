import type {DocSelection} from '@helpers/agents-docs/heroui-agents-md';
import type {DocsOptions} from '@helpers/type';

import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

import {
  buildDocTree,
  collectDemoFiles,
  collectDocFiles,
  ensureGitignoreEntry,
  generateHerouiMdIndex,
  getHerouiVersions,
  injectIntoClaudeMd,
  pullDocs
} from '@helpers/agents-docs/heroui-agents-md';
import {ValidationError} from '@helpers/errors';
import {Logger} from '@helpers/logger';
import {getConfirm, getSelect, getText} from 'src/prompts';
import {compareVersions} from 'src/scripts/helpers';

const DOCS_DIR_NAME = '.heroui-docs';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;

  return `${mb.toFixed(1)} MB`;
}

function detectInstalledPackages(cwd: string): {
  hasReact: boolean;
  hasNative: boolean;
} {
  const versions = getHerouiVersions(cwd);

  return {
    hasNative: !!versions.native,
    hasReact: !!versions.react
  };
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

function validateRequirements(cwd: string, selection: DocSelection): ValidationResult {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    // No package.json, skip validation
    return {isValid: true, warnings: []};
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const allDeps = {...dependencies, ...devDependencies};

    const warnings: string[] = [];

    // Check Tailwind CSS >= v4
    const tailwindVersion = allDeps.tailwindcss || allDeps['@tailwindcss/vite'];

    if (tailwindVersion) {
      const cleanVersion = tailwindVersion.replace(/^[<=>^~]+/, '');
      // Extract major version number
      const majorVersion = parseInt(cleanVersion.split('.')[0] || '0', 10);

      if (majorVersion < 4) {
        warnings.push(
          `Tailwind CSS version ${tailwindVersion} is installed, but HeroUI v3 requires Tailwind CSS v4+.`
        );
      }
    } else {
      warnings.push('Tailwind CSS is not installed. HeroUI v3 requires Tailwind CSS v4+.');
    }

    // For React docs: Check React >= 19.0.0
    if (selection === 'react' || selection === 'both') {
      const reactVersion = allDeps.react;

      if (reactVersion) {
        const cleanVersion = reactVersion.replace(/^[<=>^~]+/, '');
        // Compare with 19.0.0 - returns -1 if cleanVersion < 19.0.0, 0 if equal, 1 if greater
        const comparison = compareVersions(cleanVersion, '19.0.0');

        if (comparison < 0) {
          warnings.push(
            `React version ${reactVersion} is installed, but HeroUI v3 requires React 19+.`
          );
        }
      } else {
        warnings.push('React is not installed. HeroUI v3 requires React 19+.');
      }

      // Check @heroui/react >= 2.8.0 or @beta (version that supports Tailwind v4)
      const herouiReactVersion = allDeps['@heroui/react'];

      if (herouiReactVersion) {
        // Allow @beta versions
        if (herouiReactVersion.includes('@beta') || herouiReactVersion === 'beta') {
          // Beta versions are allowed, skip version check
        } else {
          const cleanVersion = herouiReactVersion.replace(/^[<=>^~]+/, '');
          // Compare with 2.8.0 - returns -1 if cleanVersion < 2.8.0, 0 if equal, 1 if greater
          const comparison = compareVersions(cleanVersion, '2.8.0');

          if (comparison < 0) {
            warnings.push(
              `@heroui/react version ${herouiReactVersion} is installed, but these docs are recommended for version >= 2.8.0 or @beta (which supports Tailwind CSS v4).`
            );
          }
        }
      } else {
        warnings.push(
          '@heroui/react is not installed. These docs are recommended for @heroui/react >= 2.8.0 or @beta (which supports Tailwind CSS v4).'
        );
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  } catch (err) {
    // If we can't parse package.json, skip validation
    return {isValid: true, warnings: []};
  }
}

async function confirmRequirements(cwd: string, selection: DocSelection): Promise<boolean> {
  const validation = validateRequirements(cwd, selection);

  if (validation.isValid) {
    return true;
  }

  Logger.warn('\n⚠️  HeroUI v3 requirements not met:');
  for (const warning of validation.warnings) {
    Logger.warn(`  • ${warning}`);
  }
  Logger.newLine();
  Logger.log(
    'The downloaded documentation is for HeroUI v3 and may not be compatible with your current setup.'
  );
  Logger.newLine();

  const confirmed = await getConfirm('Do you want to continue anyway?');

  return confirmed;
}

export async function docsAction(options: DocsOptions) {
  const cwd = process.cwd();

  // Mode logic:
  // 1. No flags → autodetect package, prompt only if neither found (or if both found)
  // 2. Library flags (--react, --native) → use that selection, prompt for output file if --output not provided
  // 3. --output alone → autodetect package, use provided output file

  let selection: DocSelection;
  let outputFiles: string[] | undefined;

  // Determine selection from flags
  if (options.react && options.native) {
    selection = 'both';
  } else if (options.react) {
    selection = 'react';
  } else if (options.native) {
    selection = 'native';
  } else {
    // Autodetect installed packages
    const {hasNative, hasReact} = detectInstalledPackages(cwd);

    if (hasReact && hasNative) {
      // Both found - prompt for selection
      if (options.output) {
        selection = await promptForLibrarySelection();
      } else {
        const promptedOptions = await promptForOptions();

        selection = promptedOptions.selection;
        outputFiles = promptedOptions.targetFiles;
      }
    } else if (hasReact) {
      // Only React found - use it automatically
      selection = 'react';
      Logger.log(chalk.dim('Detected @heroui/react, using React docs'));
    } else if (hasNative) {
      // Only Native found - use it automatically
      selection = 'native';
      Logger.log(chalk.dim('Detected heroui-native, using Native docs'));
    } else {
      // Neither found - prompt for selection
      if (options.output) {
        selection = await promptForLibrarySelection();
      } else {
        const promptedOptions = await promptForOptions();

        selection = promptedOptions.selection;
        outputFiles = promptedOptions.targetFiles;
      }
    }
  }

  // Normalize output files to array (if not already set from prompt)
  if (!outputFiles) {
    if (options.output) {
      outputFiles = Array.isArray(options.output) ? options.output : [options.output];
    } else {
      // If output file not provided, prompt for it
      const promptedFile = await promptForOutputFile();

      if (promptedFile) {
        outputFiles = Array.isArray(promptedFile) ? promptedFile : [promptedFile];
      } else {
        outputFiles = ['AGENTS.md'];
      }
    }
  }

  // Validate requirements before downloading (only for React docs)
  const canContinue = await confirmRequirements(cwd, selection);

  if (!canContinue) {
    Logger.warn('\nCancelled.');
    process.exit(0);
  }

  const docsPath = path.join(cwd, DOCS_DIR_NAME);

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
  let reactDemoFiles: {relativePath: string}[] | undefined;

  if (selection === 'react' || selection === 'both') {
    const reactDocsPath = path.join(docsPath, 'react');

    if (fs.existsSync(reactDocsPath)) {
      const reactDocFiles = collectDocFiles(reactDocsPath);

      reactSections = buildDocTree(reactDocFiles);
    }

    // Collect demo files
    const reactDemosPath = path.join(docsPath, 'react', 'demos');

    if (fs.existsSync(reactDemosPath)) {
      reactDemoFiles = collectDemoFiles(reactDemosPath);
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

  // Generate index content once (reused for all output files)
  const indexData: Parameters<typeof generateHerouiMdIndex>[0] = {
    outputFile: outputFiles[0], // Use first file for index generation (for display purposes)
    selection
  };

  if (nativeDocsLinkPath) indexData.nativeDocsPath = nativeDocsLinkPath;
  if (nativeSections) indexData.nativeSections = nativeSections;
  if (reactDocsLinkPath) indexData.reactDocsPath = reactDocsLinkPath;
  if (reactSections) indexData.reactSections = reactSections;
  if (reactDemoFiles) indexData.reactDemoFiles = reactDemoFiles;

  // Generate separate index content for React and Native
  const reactIndexContent =
    selection === 'react' || selection === 'both'
      ? generateHerouiMdIndex(indexData, 'react')
      : undefined;
  const nativeIndexContent =
    selection === 'native' || selection === 'both'
      ? generateHerouiMdIndex(indexData, 'native')
      : undefined;

  // Write to all output files
  const gitignoreResult = ensureGitignoreEntry(cwd);

  for (const outputFile of outputFiles) {
    const filePath = path.join(cwd, outputFile);
    let sizeBefore = 0;
    let isNewFile = true;
    let existingContent = '';

    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf-8');
      sizeBefore = Buffer.byteLength(existingContent, 'utf-8');
      isNewFile = false;
    }

    const newContent = injectIntoClaudeMd(existingContent, reactIndexContent, nativeIndexContent);

    fs.writeFileSync(filePath, newContent, 'utf-8');

    const sizeAfter = Buffer.byteLength(newContent, 'utf-8');

    const action = isNewFile ? 'Created' : 'Updated';
    const sizeInfo = isNewFile
      ? formatSize(sizeAfter)
      : `${formatSize(sizeBefore)} → ${formatSize(sizeAfter)}`;

    Logger.success(`✓ ${action} ${chalk.bold(outputFile)} (${sizeInfo})`);
  }

  if (gitignoreResult.updated) {
    Logger.success(`✓ Added ${chalk.bold(DOCS_DIR_NAME)} to .gitignore`);
  }
  Logger.newLine();

  // Show description of what was installed
  Logger.log(chalk.cyan('📚 What was installed:'));
  Logger.log(`  • Documentation files downloaded to ${chalk.bold(`.${DOCS_DIR_NAME}/`)}`);
  Logger.log(`  • Index generated in ${chalk.bold(outputFiles.join(', '))}`);
  if (selection === 'react' || selection === 'both') {
    Logger.log(`  • Demo files included for React code examples`);
  }
  Logger.newLine();
  Logger.log(chalk.cyan('💡 How it works:'));
  Logger.log(
    `  • AI assistants (like Claude, Cursor) can now reference HeroUI ${selectionText} docs directly`
  );
  Logger.log(
    `  • The index in ${chalk.bold(outputFiles[0])} helps assistants find relevant documentation`
  );
  Logger.log(`  • Run ${chalk.bold('heroui agents-md')} again to update docs`);
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
  targetFiles: string[];
}> {
  Logger.log(chalk.cyan('HeroUI Documentation for AI Agents'));
  Logger.info('Download the latest HeroUI documentation for AI agents to the current project\n');

  const selection = await promptForLibrarySelection();
  const targetFile = await promptForOutputFile();
  const targetFiles = Array.isArray(targetFile) ? targetFile : [targetFile];

  return {
    selection,
    targetFiles
  };
}

async function promptForOutputFile(): Promise<string | string[]> {
  const targetFileSelect = await getSelect('Target markdown file', [
    {title: 'AGENTS.md', value: 'AGENTS.md'},
    {title: 'CLAUDE.md', value: 'CLAUDE.md'},
    {title: 'Both', value: '__both__'},
    {title: 'Custom...', value: '__custom__'}
  ]);

  if (targetFileSelect === undefined) {
    Logger.warn('\nCancelled.');
    process.exit(0);
  }

  if (targetFileSelect === '__both__') {
    return ['AGENTS.md', 'CLAUDE.md'];
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
