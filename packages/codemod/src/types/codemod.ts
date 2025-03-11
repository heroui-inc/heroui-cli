export const codemods = [
  'import-heroui',
  'package-json-package-name',
  'heroui-provider',
  'tailwindcss-heroui',
  'css-variables',
  'npmrc'
] as const;

export type Codemods = (typeof codemods)[number];
