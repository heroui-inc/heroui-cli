import type {CodeBaseFile} from './get-codebase-files';

import {basename} from 'node:path';

import {Logger} from '@helpers/logger';
import {getMatchImport} from '@helpers/match';

export function getRelatedImports(fileContent: string) {
  const matchImport = getMatchImport(fileContent);
  const result = matchImport
    .map((imports) => imports.find((target) => target.includes('./')))
    .filter(Boolean);

  return result as string[];
}

export interface FetchAllRelatedFilesParams {
  content: string;
  entries: CodeBaseFile[];
  filePath: string;
}

export async function fetchAllRelatedFiles(params: FetchAllRelatedFilesParams) {
  const {content: fileContent, entries, filePath} = params;
  const result: {filePath: string; fileContent: string; fileName: string}[] = [];

  async function fetchRelatedImports(fileContent: string) {
    const relatedImports = getRelatedImports(fileContent);

    if (relatedImports.length === 0) return;

    // Add related imports
    await Promise.all(
      relatedImports.map(async (relatedPath) => {
        const targetFile = entries?.find((file) => {
          return basename(file.name).includes(basename(relatedPath));
        });
        const suffix = targetFile?.name.split('.').pop();
        const fileName = `${relatedPath.split('/').pop()}`;
        const filePath = `src/${relatedPath.replace(/.*?\//, '')}${suffix ? `.${suffix}` : ''}`;

        if (result.some((file) => file.fileName === fileName)) return;

        const fileContent = targetFile?.content ?? '';

        result.push({
          fileContent,
          fileName,
          filePath
        });

        await fetchRelatedImports(fileContent);
      })
    );
  }

  try {
    await fetchRelatedImports(fileContent);

    result.push({
      fileContent,
      fileName: filePath.split('/').pop()!,
      filePath
    });
  } catch (error) {
    Logger.error(error);
    process.exit(1);
  }

  return result;
}
