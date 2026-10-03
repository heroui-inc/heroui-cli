import type {GlobOptions} from 'tinyglobby';

import {glob} from 'tinyglobby';

interface FindFilesOptions extends GlobOptions {
  ext?: string;
}

export const findFiles = async (paths: string[], options: FindFilesOptions = {}) => {
  const {ext, ...globOptions} = options;

  if (ext) {
    paths = paths.map((path) => `${path}.${ext}`);
  }

  const files = await glob(paths, {
    absolute: true,
    cwd: process.cwd(),
    expandDirectories: false,
    ignore: ['**/node_modules', '**/dist', '**/*.d.ts', '**/build', '**/output'],
    onlyFiles: true,
    ...globOptions
  });

  return files;
};
