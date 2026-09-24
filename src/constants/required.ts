export const HEROUI_CLI = 'heroui-cli';

export const HERO_UI = '@heroui/react';
export const HEROUI_STYLES = '@heroui/styles';
export const HEROUI_PACKAGES = [HERO_UI, HEROUI_STYLES] as const;
/** Human-readable package list, so command copy stays in sync with HEROUI_PACKAGES */
export const HEROUI_PACKAGES_LABEL = HEROUI_PACKAGES.join(' and ');
export const DOCS_INSTALLED = 'https://heroui.com/docs/react/getting-started/quick-start';
