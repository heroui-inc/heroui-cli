import type {UpgradeOption} from '@helpers/actions/upgrade/upgrade-types';

import {getUpgradeVersion} from '@helpers/upgrade';
import {strip} from '@helpers/utils';
import chalk from 'chalk';
import {describe, expect, it} from 'vitest';

function option(overrides: Partial<UpgradeOption> = {}): UpgradeOption {
  return {
    isLatest: false,
    latestVersion: '2.0.0',
    package: '@heroui/react',
    version: '^1.0.0',
    versionMode: '^',
    ...overrides
  };
}

describe('getUpgradeVersion', () => {
  it('returns an empty string when there is nothing to upgrade', () => {
    expect(getUpgradeVersion([])).toBe('');
  });

  it('renders a pending upgrade', () => {
    const output = strip(getUpgradeVersion([option()]));

    expect(output).toContain('@heroui/react');
    expect(output).toContain('1.0.0');
    expect(output).toContain('2.0.0');
  });

  it('marks an installed package as latest and skips it for peers', () => {
    const latest = option({isLatest: true, latestVersion: '2.0.0', version: '2.0.0'});

    expect(strip(getUpgradeVersion([latest]))).toContain('latest');
    expect(getUpgradeVersion([latest], true)).toBe('');
  });

  it('skips empty version fields when measuring columns', () => {
    const output = strip(
      getUpgradeVersion([
        option({latestVersion: '', package: 'react', version: '', versionMode: ''})
      ])
    );

    expect(output).toContain('react');
  });

  it('keeps chalk color when measuring the version column', () => {
    const output = getUpgradeVersion([option({version: chalk.red('1.0.0')})]);

    expect(strip(output)).toContain('1.0.0');
  });
});
