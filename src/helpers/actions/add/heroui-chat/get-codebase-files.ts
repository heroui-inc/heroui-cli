import type {SAFE_ANY} from '@helpers/type';

import {fetchRequest} from '@helpers/fetch';

export const CODEBASE_FILES = [
  'index.html',
  'package.json',
  'postcss.config.js',
  'src/App.tsx',
  'src/index.css',
  'src/main.tsx',
  'tailwind.config.js',
  'tsconfig.json',
  'vite.config.ts'
];

export interface CodeBaseFile {
  name: string;
  type: 'file' | 'directory';
  isSymlink: boolean;
  content: string;
}

export async function getCodeBaseFiles(url: string, userId: string): Promise<CodeBaseFile[]> {
  const response = await fetchRequest(url, {
    fetchInfo: 'codebase files',
    headers: {userId}
  });

  const data = await response.json();

  return ((data as SAFE_ANY).entries ?? {}) as CodeBaseFile[];
}
