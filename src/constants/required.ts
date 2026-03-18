export const HEROUI_CLI = 'heroui-cli';

export const FRAMER_MOTION = 'framer-motion';
export const TAILWINDCSS = 'tailwindcss';
export const HERO_UI = '@heroui/react';
export const HEROUI_STYLES = '@heroui/styles';
export const THEME_UI = '@heroui/theme';
export const SYSTEM_UI = '@heroui/system';
export const HEROUI_PACKAGES = [HERO_UI, HEROUI_STYLES] as const;
export const ALL_COMPONENTS_REQUIRED = [HERO_UI, FRAMER_MOTION] as const;
export const HEROUI_PREFIX = '@heroui';

export const DOCS_INSTALLED = 'https://heroui.com/docs/guide/installation#global-installation';
export const DOCS_TAILWINDCSS_SETUP =
  'https://heroui.com/docs/guide/installation#tailwind-css-setup';
export const DOCS_APP_SETUP = 'https://heroui.com/docs/guide/installation#provider-setup';
export const DOCS_PNPM_SETUP = 'https://heroui.com/docs/guide/installation#setup-pnpm-optional';
export const DOCS_PROVIDER_SETUP = 'https://heroui.com/docs/guide/installation#provider-setup';

export const tailwindRequired = {
  checkPluginsRegex: /heroui(([\W\w]+)?)/,
  content: './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  darkMode: 'darkMode: "class"',
  importContent: (isTypescript = false) => {
    if (isTypescript) {
      return `import {heroui} from '@heroui/theme';`;
    }

    return `const {heroui} = require('@heroui/theme');`;
  },
  plugins: 'heroui()'
} as const;

export const appRequired = {
  import: 'HeroUIProvider'
} as const;

export const pnpmRequired = {
  content: 'public-hoist-pattern[]=*@heroui/*'
} as const;
