import type {CodeBaseFile} from './get-codebase-files';

import {basename} from 'node:path';

import {fetchRequest} from '@helpers/fetch';
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
  filePath: string;
  fetchBaseUrl?: string;
  content?: string;
  entries?: CodeBaseFile[];
}

export async function fetchAllRelatedFiles(params: FetchAllRelatedFilesParams) {
  const {content, entries, filePath} = params;
  const result: {filePath: string; fileContent: string; fileName: string}[] = [];

  async function fetchRelatedImports(fileContent: string) {
    const relatedImports = getRelatedImports(fileContent);

    if (relatedImports.length === 0) return;

    // if (parentPath) {
    //   relatedImports = relatedImports.map(
    //     (importPath) => `${join(parentPath.replace(/\/[^/]+\.tsx/, ''), importPath)}.tsx`
    //   );
    // } else {
    //   relatedImports = relatedImports.map(
    //     (importPath) => `src/${importPath.replace('./', '')}.tsx`
    //   );
    // }

    // Add related imports
    await Promise.all(
      relatedImports.map(async (relatedPath) => {
        const filePath = `src/${relatedPath.replace(/.*?\//, '')}`;

        if (result.some((file) => file.fileName === filePath)) return;

        const targetFile = entries?.find((file) => {
          return basename(file.name).includes(basename(relatedPath));
        });
        const suffix = targetFile?.name.split('.').pop();
        const fileContent = targetFile?.content ?? (await (await fetchRequest(filePath)).text());

        result.push({
          fileContent,
          fileName: `${relatedPath.split('/').pop()}${suffix ? `.${suffix}` : ''}`,
          filePath
        });

        await fetchRelatedImports(fileContent);
      })
    );
  }

  async function fetchFileContent(filePath: string) {
    const response = await fetchRequest(filePath);
    const fileContent = await response.text();

    return fileContent;
  }

  try {
    const fileContent = content ?? (await fetchFileContent(filePath));

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
