import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  FRAMER_MOTION,
  HERO_UI,
  SYSTEM_UI,
  TAILWINDCSS,
  THEME_UI
} from '../../../src/constants/required';
import {store} from '../../../src/constants/store';
import * as betaHelper from '../../../src/helpers/beta';
import {checkRequiredContentInstalled} from '../../../src/helpers/check';
import * as upgradeHelper from '../../../src/helpers/upgrade';

describe('checkRequiredContentInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock getBetaVersionData
  vi.spyOn(betaHelper, 'getBetaVersionData').mockResolvedValue('0.0.0-beta.1');

  describe('"all" type checks', () => {
    it('should return [true] when all required dependencies are installed', async () => {
      const dependencies = new Set([HERO_UI, FRAMER_MOTION, TAILWINDCSS]);
      const result = await checkRequiredContentInstalled('all', dependencies);

      expect(result).toEqual([true]);
    });

    it('should return missing dependencies', async () => {
      const dependencies = new Set([HERO_UI]); // Missing FRAMER_MOTION and TAILWINDCSS
      const result = await checkRequiredContentInstalled('all', dependencies);

      expect(result).toEqual([false, FRAMER_MOTION, TAILWINDCSS]);
    });
  });

  describe('"partial" type checks', () => {
    it('should return [true] when all required dependencies are installed', async () => {
      const dependencies = new Set([FRAMER_MOTION, SYSTEM_UI, THEME_UI, TAILWINDCSS]);
      const result = await checkRequiredContentInstalled('partial', dependencies);

      expect(result).toEqual([true]);
    });

    it('should return missing dependencies', async () => {
      const dependencies = new Set([FRAMER_MOTION]); // Missing SYSTEM_UI, THEME_UI, and TAILWINDCSS
      const result = await checkRequiredContentInstalled('partial', dependencies);

      expect(result).toEqual([false, SYSTEM_UI, THEME_UI, TAILWINDCSS]);
    });
  });

  describe('beta version handling', () => {
    it('should include beta versions when beta flag is true', async () => {
      const dependencies = new Set([]);
      const result = await checkRequiredContentInstalled('all', dependencies, {beta: true});

      expect(result).toEqual([
        false,
        `${HERO_UI}@${store.betaVersion}`,
        FRAMER_MOTION,
        TAILWINDCSS
      ]);
    });

    it('should include beta versions for all dependencies in "all" type', async () => {
      const dependencies = new Set([FRAMER_MOTION]);
      const betaSystemUI = '0.0.0-beta.1';
      const betaThemeUI = '0.0.0-beta.1';

      vi.spyOn(betaHelper, 'getBetaVersionData')
        .mockResolvedValueOnce(betaSystemUI)
        .mockResolvedValueOnce(betaThemeUI);

      const result = await checkRequiredContentInstalled('all', dependencies, {beta: true});

      expect(result).toEqual([false, `${HERO_UI}@${store.betaVersion}`, TAILWINDCSS]);
    });

    it('should include beta versions for all dependencies in "partial" type', async () => {
      const dependencies = new Set([FRAMER_MOTION]);
      const betaSystemUI = '0.0.0-beta.1';
      const betaThemeUI = '0.0.0-beta.1';

      vi.spyOn(betaHelper, 'getBetaVersionData')
        .mockResolvedValueOnce(betaSystemUI)
        .mockResolvedValueOnce(betaThemeUI);

      const result = await checkRequiredContentInstalled('partial', dependencies, {beta: true});

      expect(result).toEqual([
        false,
        `${SYSTEM_UI}@${betaSystemUI}`,
        `${THEME_UI}@${betaThemeUI}`,
        TAILWINDCSS
      ]);
    });
  });

  describe('peer dependencies handling', () => {
    it('should check peer dependencies when peerDependencies flag is true', async () => {
      const dependencies = new Set([HERO_UI, FRAMER_MOTION, TAILWINDCSS]);
      const mockAllDependencies = {
        '@heroui/react': '1.0.0',
        react: '17.0.0'
      };
      const mockPackageNames = ['@heroui/react'];

      vi.spyOn(upgradeHelper, 'getPackagePeerDep').mockResolvedValue([
        {
          isLatest: false,
          latestVersion: '18.0.0',
          package: 'react',
          version: '17.0.0',
          versionMode: 'exact'
        }
      ]);

      const result = await checkRequiredContentInstalled('all', dependencies, {
        allDependencies: mockAllDependencies,
        packageNames: mockPackageNames,
        peerDependencies: true
      });

      expect(result).toEqual([false, 'react@18.0.0']);
      expect(upgradeHelper.getPackagePeerDep).toHaveBeenCalledWith(
        '@heroui/react',
        mockAllDependencies,
        expect.any(Set)
      );
    });

    it('should handle beta versions with peer dependencies', async () => {
      const dependencies = new Set([FRAMER_MOTION]);
      const mockAllDependencies = {
        '@heroui/react': '1.0.0',
        react: '17.0.0'
      };
      const mockPackageNames = ['@heroui/react'];
      const betaSystemUI = '0.0.0-beta.1';
      const betaThemeUI = '0.0.0-beta.1';

      vi.spyOn(betaHelper, 'getBetaVersionData')
        .mockResolvedValueOnce(betaSystemUI)
        .mockResolvedValueOnce(betaThemeUI);

      vi.spyOn(upgradeHelper, 'getPackagePeerDep').mockResolvedValue([
        {
          isLatest: false,
          latestVersion: '18.0.0',
          package: 'react',
          version: '17.0.0',
          versionMode: 'exact'
        }
      ]);

      const result = await checkRequiredContentInstalled('partial', dependencies, {
        allDependencies: mockAllDependencies,
        beta: true,
        packageNames: mockPackageNames,
        peerDependencies: true
      });

      expect(result).toEqual([
        false,
        `${SYSTEM_UI}@${betaSystemUI}`,
        `${THEME_UI}@${betaThemeUI}`,
        TAILWINDCSS,
        'react@18.0.0'
      ]);
    });
  });
});
