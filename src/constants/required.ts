import {existsSync} from 'node:fs';

import fg from 'fast-glob';
import {join} from 'pathe';

import {getPackageInfo} from '@helpers/package';

import {type HeroUIComponent, type HeroUIComponents} from './component';
import {resolver} from './path';

export const HEROUI_CLI = 'heroui-cli';

export const FRAMER_MOTION = 'framer-motion';
export const TAILWINDCSS = 'tailwindcss';
export const HERO_UI = '@heroui/react';
export const THEME_UI = '@heroui/theme';
export const SYSTEM_UI = '@heroui/system';
export const ALL_COMPONENTS_REQUIRED = [HERO_UI, FRAMER_MOTION] as const;

export const DOCS_INSTALLED = 'https://heroui.com/docs/guide/installation#global-installation';
export const DOCS_TAILWINDCSS_SETUP =
  'https://heroui.com/docs/guide/installation#tailwind-css-setup';
export const DOCS_APP_SETUP = 'https://heroui.com/docs/guide/installation#provider-setup';
export const DOCS_PNPM_SETUP = 'https://heroui.com/docs/guide/installation#setup-pnpm-optional';
export const DOCS_PROVIDER_SETUP = 'https://heroui.com/docs/guide/installation#provider-setup';

// Record the required content of tailwind.config file
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

export const individualTailwindRequired = {
  content: (currentComponents: HeroUIComponents, isPnpm: boolean) => {
    currentComponents.forEach((component) => {
      const walkDeps = walkDepComponents(component, isPnpm) as HeroUIComponents;

      currentComponents.push(...walkDeps);
    });

    const outputComponents = [
      ...new Set(
        currentComponents.map((component) => {
          return component.style || component.name;
        })
      )
    ];

    if (outputComponents.length === 1) {
      return `./node_modules/@heroui/theme/dist/components/${outputComponents[0]}.js`;
    }
    const requiredContent = outputComponents
      .reduce((acc, component) => {
        return (acc += `${component}|`);
      }, '')
      .replace(/\|$/, '');

    return `./node_modules/@heroui/theme/dist/components/(${requiredContent}).js`;
  },
  plugins: 'heroui()'
} as const;

export const appRequired = {
  import: 'HeroUIProvider'
} as const;

export const pnpmRequired = {
  content: 'public-hoist-pattern[]=*@heroui/*'
} as const;

export function walkDepComponents(heroUIComponent: HeroUIComponent, isPnpm: boolean) {
  const component = heroUIComponent.name;
  let componentPath = resolver(`node_modules/@heroui/${component}`);
  const components = [heroUIComponent];

  if (!existsSync(componentPath) && isPnpm) {
    const pnpmDir = resolver('node_modules/.pnpm');

    const file = fg.sync(`**/@heroui/${component}`, {
      absolute: true,
      cwd: pnpmDir,
      onlyDirectories: true
    })[0];

    if (file) {
      componentPath = file;
    } else {
      return components;
    }
  }

  const {currentComponents} = getPackageInfo(join(componentPath, 'package.json'));

  if (currentComponents.length) {
    for (const component of currentComponents) {
      const result = walkDepComponents(component, isPnpm);

      components.push(...result);
    }
  }

  return components;
}
