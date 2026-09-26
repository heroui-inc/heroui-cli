import {Logger} from '@helpers/logger';
import {
  PasCalCase,
  fillAnsiLength,
  getColorVersion,
  getCommandDescAndLog,
  getPackageManagerInfo,
  getVersionAndMode,
  isMajorUpdate,
  isMinorUpdate,
  isPatchUpdate,
  safeJsonParse,
  strip,
  transformPeerVersion
} from '@helpers/utils';
import {describe, expect, it, vi} from 'vitest';

describe('utils', () => {
  it('logs the banner and returns the description', () => {
    const gradient = vi.spyOn(Logger, 'gradient').mockImplementation(() => {});

    expect(getCommandDescAndLog('banner', 'desc')).toBe('desc');
    expect(gradient).toHaveBeenCalledWith('banner');
  });

  it('converts kebab-case to PascalCase', () => {
    expect(PasCalCase('test-test')).toBe('TestTest');
    expect(PasCalCase('my-component')).toBe('MyComponent');
  });

  it('colors version changes by semver level', () => {
    expect(strip(isMajorUpdate('1.0.0', '2.0.0'))).toBe('2.0.0');
    expect(isMajorUpdate('1.0.0', '1.2.0')).toBe('');
    expect(strip(isMinorUpdate('1.0.0', '1.2.0'))).toBe('1.2.0');
    expect(isMinorUpdate('1.2.0', '1.2.3')).toBe('');
    expect(strip(isPatchUpdate('1.2.0', '1.2.3'))).toBe('1.2.3');
    expect(isPatchUpdate('1.2.3', '1.2.3')).toBe('');
    expect(strip(getColorVersion('1.0.0', '2.0.0'))).toBe('2.0.0');
    expect(strip(getColorVersion('1.0.0', '1.2.0'))).toBe('1.2.0');
    expect(strip(getColorVersion('1.2.0', '1.2.3'))).toBe('1.2.3');
    expect(getColorVersion('1.2.3', '1.2.3')).toBe('1.2.3');
  });

  it('splits a dependency spec into version and mode', () => {
    expect(getVersionAndMode({'@heroui/react': '^2.0.0'}, '@heroui/react')).toEqual({
      currentVersion: '2.0.0',
      versionMode: '^'
    });
    expect(getVersionAndMode({}, 'missing')).toEqual({currentVersion: '', versionMode: ''});
    expect(getVersionAndMode({react: 18}, 'react')).toEqual({currentVersion: '', versionMode: ''});
  });

  it('parses subprocess JSON and falls back otherwise', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({a: 1});
    expect(safeJsonParse('   ', {ok: false})).toEqual({ok: false});
    expect(safeJsonParse('nope', [])).toEqual([]);
    expect(safeJsonParse(1, null)).toBeNull();
  });

  it('maps package manager commands', () => {
    expect(getPackageManagerInfo('npm')).toEqual({
      install: 'install',
      remove: 'uninstall',
      run: 'run'
    });
    expect(getPackageManagerInfo('pnpm').install).toBe('add');
    expect(getPackageManagerInfo('yarn').remove).toBe('remove');
    expect(getPackageManagerInfo('bun').run).toBe('run');
  });

  it('picks a version out of a peer range', () => {
    expect(transformPeerVersion('>=1.0.0')).toBe('1.0.0');
    expect(transformPeerVersion('>=11.5.6 || >=12.0.0-alpha.1')).toBe('11.5.6');
    expect(transformPeerVersion('>=11.5.6 || >=12.0.0', true)).toBe('12.0.0');
  });

  it('pads and strips ANSI text', () => {
    expect(fillAnsiLength('ab', 4)).toBe('ab  ');
    expect(strip(fillAnsiLength('\u001b[31mab\u001b[0m', 4))).toBe('ab  ');
    expect(strip('\u001b[31mhi\u001b[0m')).toBe('hi');
  });
});
