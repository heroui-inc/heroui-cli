import {readFileSync, realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';

interface InstalledPackage {
  packagePath: string;
  manifest: {
    version: string;
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, {optional?: boolean}>;
  };
}

/** Read installed metadata without loading package code, including packages with private or CSS-only exports. */
export function getInstalledPackage(
  name: string,
  fromPackagePath: string
): InstalledPackage | undefined {
  const require = createRequire(resolve(fromPackagePath));
  let candidates: string[];

  try {
    candidates = [require.resolve(`${name}/package.json`)];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== 'MODULE_NOT_FOUND' && code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      throw error;
    }
    candidates = (require.resolve.paths(name) ?? []).map((directory) =>
      join(directory, name, 'package.json')
    );
  }

  for (const candidate of candidates) {
    try {
      // Resolve symlinks so peers are looked up from the consumer's actual installation (e.g. pnpm).
      const packagePath = realpathSync(candidate);
      const manifest: InstalledPackage['manifest'] = JSON.parse(readFileSync(packagePath, 'utf-8'));

      return {manifest, packagePath};
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }
    }
  }

  return undefined;
}
