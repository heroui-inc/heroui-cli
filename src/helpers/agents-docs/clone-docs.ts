import type {DocSelection} from './heroui-agents-md';

import {execSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Root-level migration files to copy. index.mdx is not copied (used only for include resolution). */
const MIGRATION_ROOT_FILES = ['agent-index.mdx', 'hooks.mdx', 'styling.mdx'] as const;

/** (workflows) subdir name; only files whose name starts with "agent-" are copied (non-agent guides excluded). */
const MIGRATION_WORKFLOWS_DIR = '(workflows)';

const INCLUDE_TAG_REGEX = /<include>(.+?)<\/include>/g;

/**
 * Replaces <include>path#anchor</include> with the inner content of <section id="anchor">...</section>
 * from the referenced file. Used when copying migration agent guides so they are self-contained.
 */
function resolveIncludeTags(
  content: string,
  currentFileRelativePath: string,
  sourceMigrationDir: string
): string {
  const currentDir = currentFileRelativePath.includes('/')
    ? currentFileRelativePath.slice(0, currentFileRelativePath.lastIndexOf('/'))
    : '.';

  return content.replace(INCLUDE_TAG_REGEX, (match, pathAndAnchor: string) => {
    const hashIndex = pathAndAnchor.indexOf('#');

    if (hashIndex === -1) {
      return match;
    }

    const relativePath = pathAndAnchor.slice(0, hashIndex).trim();
    const anchor = pathAndAnchor.slice(hashIndex + 1).trim();

    if (!relativePath || !anchor) {
      return match;
    }

    const resolvedRelative = path
      .normalize(path.join(currentDir, relativePath))
      .replace(/\\/g, '/');
    const targetPath = path.join(sourceMigrationDir, resolvedRelative);

    if (!fs.existsSync(targetPath)) {
      return match;
    }

    const targetContent = fs.readFileSync(targetPath, 'utf-8');
    const sectionStart = `<section id="${anchor}">`;
    const startIdx = targetContent.indexOf(sectionStart);

    if (startIdx === -1) {
      return match;
    }

    const innerStart = startIdx + sectionStart.length;
    const endIdx = targetContent.indexOf('</section>', innerStart);

    if (endIdx === -1) {
      return match;
    }

    return targetContent.slice(innerStart, endIdx).trim();
  });
}

export async function cloneDocsFolder(
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

    // Build sparse-checkout patterns. For React: include full folder but exclude migration.
    if (selection === 'react') {
      const patterns = [
        'apps/docs/content/docs/react',
        '!apps/docs/content/docs/react/migration',
        'apps/docs/src/demos'
      ].join('\n');

      execSync('git sparse-checkout set --no-cone --stdin', {
        cwd: tempDir,
        input: patterns,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else if (selection === 'native') {
      execSync('git sparse-checkout set apps/docs/content/docs/native', {
        cwd: tempDir,
        stdio: 'pipe'
      });
    } else {
      execSync('git sparse-checkout set apps/docs/content/docs/react/migration', {
        cwd: tempDir,
        stdio: 'pipe'
      });
    }

    // Ensure destination directory exists (but don't remove it - preserve other libraries)
    fs.mkdirSync(destDir, {recursive: true});

    // Copy docs to destination - only the selected library
    if (selection === 'react') {
      const sourceReactDir = path.join(tempDir, 'apps', 'docs', 'content', 'docs', 'react');

      if (fs.existsSync(sourceReactDir)) {
        const destReactDir = path.join(destDir, 'react');

        if (fs.existsSync(destReactDir)) {
          fs.rmSync(destReactDir, {recursive: true});
        }
        fs.mkdirSync(destReactDir, {recursive: true});
        fs.cpSync(sourceReactDir, destReactDir, {recursive: true});
      }

      const sourceDemosDir = path.join(tempDir, 'apps', 'docs', 'src', 'demos');

      if (fs.existsSync(sourceDemosDir)) {
        const destDemosDir = path.join(destDir, 'react', 'demos');

        if (fs.existsSync(destDemosDir)) {
          fs.rmSync(destDemosDir, {recursive: true});
        }
        fs.mkdirSync(destDemosDir, {recursive: true});
        fs.cpSync(sourceDemosDir, destDemosDir, {recursive: true});
      }
    } else if (selection === 'native') {
      const sourceNativeDir = path.join(tempDir, 'apps', 'docs', 'content', 'docs', 'native');

      if (fs.existsSync(sourceNativeDir)) {
        const destNativeDir = path.join(destDir, 'native');

        if (fs.existsSync(destNativeDir)) {
          fs.rmSync(destNativeDir, {recursive: true});
        }
        fs.mkdirSync(destNativeDir, {recursive: true});
        fs.cpSync(sourceNativeDir, destNativeDir, {recursive: true});
      }
    } else {
      const sourceMigrationDir = path.join(
        tempDir,
        'apps',
        'docs',
        'content',
        'docs',
        'react',
        'migration'
      );

      if (fs.existsSync(sourceMigrationDir)) {
        const destMigrationDir = path.join(destDir, 'migration');

        if (fs.existsSync(destMigrationDir)) {
          fs.rmSync(destMigrationDir, {recursive: true});
        }
        fs.mkdirSync(destMigrationDir, {recursive: true});

        for (const name of MIGRATION_ROOT_FILES) {
          const sourcePath = path.join(sourceMigrationDir, name);

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, path.join(destMigrationDir, name));
          }
        }

        const sourceWorkflowsDir = path.join(sourceMigrationDir, MIGRATION_WORKFLOWS_DIR);

        if (fs.existsSync(sourceWorkflowsDir)) {
          const destWorkflowsDir = path.join(destMigrationDir, MIGRATION_WORKFLOWS_DIR);

          fs.mkdirSync(destWorkflowsDir, {recursive: true});

          for (const name of fs.readdirSync(sourceWorkflowsDir)) {
            if (!name.startsWith('agent-')) {
              continue;
            }

            const sourcePath = path.join(sourceWorkflowsDir, name);
            const destPath = path.join(destWorkflowsDir, name);
            const relativePath = `${MIGRATION_WORKFLOWS_DIR}/${name}`;

            if (!fs.statSync(sourcePath).isFile()) {
              continue;
            }

            const content = fs.readFileSync(sourcePath, 'utf-8');
            const resolved = resolveIncludeTags(content, relativePath, sourceMigrationDir);

            fs.writeFileSync(destPath, resolved, 'utf-8');
          }
        }

        const sourceComponentsDir = path.join(sourceMigrationDir, '(components)');

        if (fs.existsSync(sourceComponentsDir)) {
          const destComponentsDir = path.join(destMigrationDir, '(components)');

          fs.mkdirSync(destComponentsDir, {recursive: true});
          fs.cpSync(sourceComponentsDir, destComponentsDir, {recursive: true});
        }
      }
    }
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, {recursive: true});
    }
  }
}
