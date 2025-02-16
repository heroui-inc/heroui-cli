import {checkPeerDependencies} from '@helpers/check';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import * as packageHelper from '../../../src/helpers/package';
import * as upgradeHelper from '../../../src/helpers/upgrade';

describe('checkPeerDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no peer dependencies need updating', async () => {
    const mockAllDependencies = {
      '@heroui/react': '1.0.0',
      react: '18.0.0'
    };
    const mockPackageNames = ['@heroui/react'];

    vi.spyOn(upgradeHelper, 'getPackagePeerDep').mockResolvedValue([
      {
        isLatest: true,
        latestVersion: '18.0.0',
        package: 'react',
        version: '18.0.0',
        versionMode: 'exact'
      }
    ]);

    const result = await checkPeerDependencies({
      allDependencies: mockAllDependencies,
      packageNames: mockPackageNames
    });

    expect(result).toEqual([]);
    expect(upgradeHelper.getPackagePeerDep).toHaveBeenCalledWith(
      '@heroui/react',
      mockAllDependencies,
      expect.any(Set)
    );
  });

  it('should return array of outdated peer dependencies', async () => {
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

    const result = await checkPeerDependencies({
      allDependencies: mockAllDependencies,
      packageNames: mockPackageNames
    });

    expect(result).toEqual(['react@18.0.0']);
  });

  it('should handle multiple packages with peer dependencies', async () => {
    const mockAllDependencies = {
      '@heroui/icons': '1.0.0',
      '@heroui/react': '1.0.0',
      react: '17.0.0',
      typescript: '4.0.0'
    };
    const mockPackageNames = ['@heroui/react', '@heroui/icons'];

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

    vi.spyOn(upgradeHelper, 'getPackagePeerDep')
      .mockResolvedValueOnce([
        {
          isLatest: false,
          latestVersion: '18.0.0',
          package: 'react',
          version: '17.0.0',
          versionMode: 'exact'
        }
      ])
      .mockResolvedValueOnce([
        {
          isLatest: false,
          latestVersion: '5.0.0',
          package: 'typescript',
          version: '4.0.0',
          versionMode: 'exact'
        }
      ]);

    const result = await checkPeerDependencies({
      allDependencies: mockAllDependencies,
      packageNames: mockPackageNames
    });

    expect(result).toEqual(['react@18.0.0', 'typescript@5.0.0']);
    expect(upgradeHelper.getPackagePeerDep).toHaveBeenCalledTimes(2);
  });

  it('should keep only the latest version when same package appears multiple times', async () => {
    const mockAllDependencies = {
      '@heroui/icons': '1.0.0',
      '@heroui/react': '1.0.0',
      react: '17.0.0'
    };
    const mockPackageNames = ['@heroui/react', '@heroui/icons'];

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

    vi.spyOn(upgradeHelper, 'getPackagePeerDep')
      .mockResolvedValueOnce([
        {
          isLatest: false,
          latestVersion: '18.0.0',
          package: 'react',
          version: '17.0.0',
          versionMode: 'exact'
        }
      ])
      .mockResolvedValueOnce([
        {
          isLatest: false,
          latestVersion: '18.2.0',
          package: 'react',
          version: '17.0.0',
          versionMode: 'exact'
        }
      ]);

    const result = await checkPeerDependencies({
      allDependencies: mockAllDependencies,
      packageNames: mockPackageNames
    });

    expect(result).toEqual(['react@18.2.0']);
    expect(upgradeHelper.getPackagePeerDep).toHaveBeenCalledTimes(2);
  });
});
