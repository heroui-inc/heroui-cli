import {defineConfig} from 'tsup';

export default defineConfig((options) => {
  const posthogKey = process.env['HEROUI_CLI_POSTHOG_KEY'] ?? '';

  return {
    banner: {js: '#!/usr/bin/env node'},
    clean: true,
    define: {
      __HEROUI_CLI_POSTHOG_KEY__: JSON.stringify(posthogKey)
    },
    dts: true,
    entry: ['src/index.ts'],
    format: ['esm'],
    minify: !options.watch,
    outDir: 'dist',
    skipNodeModulesBundle: true,
    sourcemap: true,
    splitting: false,
    target: 'esnext',
    treeshake: true,
    tsconfig: 'tsconfig.json'
  };
});
