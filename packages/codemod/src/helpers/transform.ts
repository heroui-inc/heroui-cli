import {resolver} from '../constants/path';

/**
 * Transforms the paths to the correct format
 * @param paths - The paths to transform
 * @example ['src'] --> ['absolute/path/to/src\/**\/*']
 */
export function transformPaths(paths?: string[]) {
  paths ??= ['.'];
  paths = [paths].flat();

  return paths.map((path) => resolver(path) + '/**/*');
}
