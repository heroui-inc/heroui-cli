import {getOptionsValue} from './options';
import {getStore, writeFileAndUpdateStore} from './store';

async function tryImportPackage(packageName: string) {
  try {
    return await import(packageName);
  } catch {
    return null;
  }
}

export async function lintWithESLint(filePaths: string[]) {
  const eslintPkg = await tryImportPackage('eslint');

  if (eslintPkg) {
    const ESLint = eslintPkg.ESLint;
    const eslint = new ESLint({
      fix: true
    });
    const result = await eslint.lintFiles(filePaths);

    await ESLint.outputFixes(result);

    return result;
  }
}

export async function lintWithPrettier(filePaths: string[]) {
  const prettier = await tryImportPackage('prettier');
  const options = await prettier.resolveConfig(process.cwd());

  if (prettier) {
    await Promise.all(
      filePaths.map(async (filePath) => {
        const rawContent = getStore(filePath, 'rawContent');
        const formattedContent = await prettier.format(rawContent, {
          options,
          parser: 'typescript'
        });

        writeFileAndUpdateStore(filePath, 'rawContent', formattedContent);
      })
    );
  }
}

/**
 * Try linting a file with ESLint or Prettier
 */
export async function tryLintFile(filePaths: string[]) {
  try {
    if (getOptionsValue('format')) {
      await lintWithPrettier(filePaths);
    } else {
      await lintWithESLint(filePaths);
    }
  } catch {
    return;
  }
}
