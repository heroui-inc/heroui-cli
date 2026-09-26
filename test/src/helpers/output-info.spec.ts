import type {PackageComponent} from '@helpers/package';

import {Logger} from '@helpers/logger';
import {outputBox, outputComponents, outputInfo} from '@helpers/output-info';
import {describe, expect, it, vi} from 'vitest';

function component(overrides: Partial<PackageComponent> = {}): PackageComponent {
  return {
    description: 'Button',
    docs: 'https://heroui.com',
    name: '@heroui/react',
    package: '@heroui/react',
    peerDependencies: {},
    status: 'stable',
    style: '',
    version: '3.0.0 new: 3.1.0',
    versionMode: '^',
    ...overrides
  };
}

describe('output-info', () => {
  it('warns when there are no components', () => {
    const warn = vi.spyOn(Logger, 'prefix').mockImplementation(() => {});

    outputComponents({components: []});
    outputComponents({components: [], warnError: false});

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('prints a component table', () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});
    const info = vi.spyOn(Logger, 'info').mockImplementation(() => {});

    outputComponents({
      commandName: 'list',
      components: [component(), component({package: '@heroui/styles', version: '1.0.0'})],
      message: 'Installed\n'
    });

    expect(info).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    info.mockRestore();
  });

  it('prints environment info', () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    outputInfo();

    expect(log.mock.calls.flat().join(' ')).toContain('Environment Info:');
    log.mockRestore();
  });

  it('builds a box and can skip logging it', () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});
    const boxed = outputBox({
      align: 'left',
      color: 'yellow',
      text: 'hello',
      title: 'Title'
    });
    const centered = outputBox({
      align: 'center',
      center: true,
      log: false,
      padding: 1,
      text: 'one\ntwo',
      title: 'Center'
    });
    const right = outputBox({align: 'right', text: 'side', title: 'Right'});
    const plain = outputBox({text: 'plain'});

    expect(boxed).toContain('hello');
    expect(centered).toContain('one');
    expect(right).toContain('side');
    expect(plain).toContain('plain');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
