import type {HeroUIComponents} from 'src/constants/component';

import {checkTailwind} from '@helpers/check';
import * as required from 'src/constants/required';
import {individualTailwindRequired} from 'src/constants/required';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import * as packageHelper from '../../../src/helpers/package';

const mockAllDependencies = {
  '@heroui/icons': '1.0.0',
  '@heroui/react': '1.0.0',
  react: '17.0.0',
  typescript: '4.0.0'
};

describe('checkTailwind', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(packageHelper, 'getPackageInfo').mockReturnValue({
      allDependencies: mockAllDependencies,
      allDependenciesKeys: new Set(Object.keys(mockAllDependencies)),
      currentComponents: [],
      dependencies: {},
      devDependencies: {},
      isAllComponents: false,
      packageJson: {
        dependencies: mockAllDependencies
      }
    });
  });

  describe('all type configuration', () => {
    it('validates complete configuration successfully', () => {
      const mockTailwindContent = `
        module.exports = {
          darkMode: ['class'],
          content: [
            './node_modules/@heroui/theme/dist/**/*.{js,jsx,ts,tsx}',
          ],
          plugins: [require('@heroui/react/plugin')],
        }
      `;

      const result = checkTailwind(
        'all',
        'path/to/tailwind.config.js',
        undefined,
        false,
        mockTailwindContent
      );

      expect(result).toEqual([true]);
    });

    it('identifies missing requirements', () => {
      const mockTailwindContent = `
        module.exports = {
          content: [],
          plugins: [],
        }
      `;

      const result = checkTailwind(
        'all',
        'path/to/tailwind.config.js',
        undefined,
        false,
        mockTailwindContent
      );

      expect(result).toEqual([
        false,
        required.tailwindRequired.darkMode,
        required.tailwindRequired.content,
        required.tailwindRequired.plugins
      ]);
    });

    it('accepts darkMode as string', () => {
      const mockTailwindContent = `
        module.exports = {
          darkMode: 'class',
          content: [
            './node_modules/@heroui/theme/dist/**/*.{js,jsx,ts,tsx}',
          ],
          plugins: [require('@heroui/react/plugin')],
        }
      `;

      const result = checkTailwind(
        'all',
        'path/to/tailwind.config.js',
        undefined,
        false,
        mockTailwindContent
      );

      expect(result).toEqual([true]);
    });
  });

  describe('partial type configuration', () => {
    it('validates complete configuration successfully', async () => {
      const components: HeroUIComponents = [
        {
          description: '',
          docs: '',
          name: 'button',
          package: '@heroui/react',
          peerDependencies: {},
          status: 'stable',
          style: '',
          version: '1.0.0',
          versionMode: ''
        }
      ];
      const mockTailwindContent = `
        module.exports = {
          content: [
            ${individualTailwindRequired.content(components, false)},
          ],
          plugins: [require('@heroui/react/plugin')],
        }
      `;

      const result = checkTailwind(
        'partial',
        'path/to/tailwind.config.js',
        components,
        false,
        mockTailwindContent
      );

      expect(result).toEqual([true]);
    });

    it('identifies missing requirements', () => {
      const mockTailwindContent = `
        module.exports = {
          content: [],
          plugins: [],
        }
      `;
      const components: HeroUIComponents = [
        {
          description: '',
          docs: '',
          name: 'button',
          package: '@heroui/react',
          peerDependencies: {},
          status: 'stable',
          style: '',
          version: '1.0.0',
          versionMode: ''
        },
        {
          description: '',
          docs: '',
          name: 'input',
          package: '@heroui/react',
          peerDependencies: {},
          status: 'stable',
          style: '',
          version: '1.0.0',
          versionMode: ''
        }
      ];

      const result = checkTailwind(
        'partial',
        'path/to/tailwind.config.js',
        components,
        false,
        mockTailwindContent
      );

      expect(result).toEqual([
        false,
        individualTailwindRequired.content(components, false),
        required.tailwindRequired.plugins
      ]);
    });

    it('handles pnpm path correctly', () => {
      const mockTailwindContent = `
        module.exports = {
          content: [],
          plugins: [],
        }
      `;
      const components: HeroUIComponents = [
        {
          description: '',
          docs: '',
          name: 'button',
          package: '@heroui/react',
          peerDependencies: {},
          status: 'stable',
          style: '',
          version: '1.0.0',
          versionMode: ''
        }
      ];

      const result = checkTailwind(
        'partial',
        'path/to/tailwind.config.js',
        components,
        true,
        mockTailwindContent
      );

      expect(result).toEqual([
        false,
        individualTailwindRequired.content(components, true),
        required.tailwindRequired.plugins
      ]);
    });

    it('should log warning when using global content in partial mode', () => {
      const mockTailwindContent = `
        module.exports = {
          content: [
            './node_modules/@heroui/theme/dist/**/*.{js,jsx,ts,tsx}',
          ],
          plugins: [require('@heroui/react/plugin')],
        }
      `;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const components: HeroUIComponents = [
        {
          description: '',
          docs: '',
          name: 'button',
          package: '@heroui/react',
          peerDependencies: {},
          status: 'stable',
          style: '',
          version: '1.0.0',
          versionMode: ''
        }
      ];

      const result = checkTailwind(
        'partial',
        'path/to/tailwind.config.js',
        components,
        false,
        mockTailwindContent,
        true
      );

      expect(result).toEqual([true]);
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0]?.[0]).toContain('Attention');
    });

    it('should return [true] for empty components in "partial" type', () => {
      const result = checkTailwind('partial', 'path/to/tailwind.config.js', [], false, '');

      expect(result).toEqual([true]);
    });
  });
});
