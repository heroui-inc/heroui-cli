import {join} from 'node:path';

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
}

export async function fetchAllRelatedFiles(params: FetchAllRelatedFilesParams) {
  const {content, fetchBaseUrl, filePath} = params;
  const result: {filePath: string; fileContent: string; fileName: string}[] = [];

  async function fetchRelatedImports(fileContent: string, parentPath: string = '') {
    let relatedImports = getRelatedImports(fileContent);

    if (relatedImports.length === 0) return;

    if (parentPath) {
      relatedImports = relatedImports.map(
        (importPath) => `${join(parentPath.replace(/\/[^/]+\.tsx/, ''), importPath)}.tsx`
      );
    } else {
      relatedImports = relatedImports.map(
        (importPath) => `src/${importPath.replace('./', '')}.tsx`
      );
    }

    // Add related imports
    await Promise.all(
      relatedImports.map(async (relatedPath) => {
        const filePath = `${fetchBaseUrl}/${relatedPath}`;
        const response = await fetchRequest(filePath);
        const fileContent = await response.text();

        result.push({
          fileContent,
          fileName: relatedPath.split('/').pop()!,
          filePath: relatedPath
        });

        await fetchRelatedImports(fileContent, relatedPath);
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
