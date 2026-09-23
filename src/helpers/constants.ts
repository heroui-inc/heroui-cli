export const DEFAULT_FILE_IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  'public/**',
  'out/**'
] as const;

export const VERSION_MODE_REGEX = /([\^~])/;
/** Matches every range modifier, unlike VERSION_MODE_REGEX which only finds the first */
export const VERSION_MODE_GLOBAL_REGEX = /[\^~]/g;
export const HTTP_REGEX = /^https?:\/\//;
// eslint-disable-next-line no-control-regex
export const COLOR_MATCH_REGEX = /\x1B\[\d+m/g;
