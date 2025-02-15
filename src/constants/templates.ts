import type {CheckType} from '@helpers/check';

export const APP_REPO = 'https://codeload.github.com/heroui-inc/next-app-template/tar.gz/main';
export const PAGES_REPO = 'https://codeload.github.com/heroui-inc/next-pages-template/tar.gz/main';
export const VITE_REPO = 'https://codeload.github.com/heroui-inc/vite-template/tar.gz/main';

export const APP_DIR = 'next-app-template-main';
export const PAGES_DIR = 'next-pages-template-main';
export const VITE_DIR = 'vite-template-main';

export const APP_NAME = 'next-app-template';
export const PAGES_NAME = 'next-pages-template';
export const VITE_NAME = 'vite-template';
export const DEFAULT_PROJECT_NAME = 'heroui-app';

export function tailwindTemplate(type: 'all', content?: string): string;
export function tailwindTemplate(type: 'partial', content: string): string;
export function tailwindTemplate(type: CheckType, content?: string) {
  if (type === 'all') {
    return `// tailwind.config.js
const {heroui} = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui()],
};`;
  } else {
    return `// tailwind.config.js
const {heroui} = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    ${JSON.stringify(content)},
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui()],
};`;
  }
}
