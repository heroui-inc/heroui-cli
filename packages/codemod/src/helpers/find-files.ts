import fg from 'fast-glob';

interface FindFilesOptions extends fg.Options {
  ext?: string;
}

export const findFiles = async (paths: string[], options: FindFilesOptions = {}) => {
  const {ext, ...fgOptions} = options;

  if (ext) {
    paths = paths.map((path) => `${path}.${ext}`);
  }

  const files = await fg.glob(paths, {
    absolute: true,
    cwd: process.cwd(),
    ignore: ['**/node_modules', '**/dist', '**/*.d.ts', '**/build', '**/output'],
    onlyFiles: true,
    ...fgOptions
  });

  return files;
};
