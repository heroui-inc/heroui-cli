import type {InitOptions} from '@helpers/type';

export const APP_REPO = 'https://codeload.github.com/heroui-inc/next-app-template/tar.gz/main';
export const PAGES_REPO = 'https://codeload.github.com/heroui-inc/next-pages-template/tar.gz/main';
export const VITE_REPO = 'https://codeload.github.com/heroui-inc/vite-template/tar.gz/main';
export const REACT_ROUTER_REPO =
  'https://codeload.github.com/heroui-inc/react-router-template/tar.gz/main';

export const APP_DIR = 'next-app-template-main';
export const PAGES_DIR = 'next-pages-template-main';
export const VITE_DIR = 'vite-template-main';
export const REACT_ROUTER_DIR = 'react-router-template-main';

export const APP_NAME = 'next-app-template';
export const PAGES_NAME = 'next-pages-template';
export const VITE_NAME = 'vite-template';
export const REACT_ROUTER_NAME = 'react-router-template';
export const DEFAULT_PROJECT_NAME = 'heroui-app';

/**
 * Lives here rather than in init-action so that helpers/init can validate a
 * template name without importing the action that imports it back.
 */
export const templatesMap: Record<Required<InitOptions>['template'], string> = {
  app: APP_NAME,
  pages: PAGES_NAME,
  'react-router': REACT_ROUTER_NAME,
  vite: VITE_NAME
};
