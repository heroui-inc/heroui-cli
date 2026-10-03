import type {PackageComponent} from '@helpers/package';

import {Logger} from '@helpers/logger';
import {outputBox, outputComponents, outputInfo} from '@helpers/output-info';
import {describe, expect, it, vi} from 'vitest';

const runEnvinfo = vi.hoisted(() =>
  vi.fn(async () =>
    JSON.stringify({
      Binaries: {
        Node: {path: '/Users/me/.nvm/versions/node/v22.22.0/bin/node', version: '22.22.0'}
      },
      System: {CPU: 'arm64', OS: 'macOS'},
      npmPackages: {
        '@heroui/react': {installed: '3.0.0', wanted: '^3.0.0'},
        tailwindcss: {installed: '4.0.0', wanted: '^4.0.0'}
      }
    })
  )
);

vi.mock('envinfo', () => ({
  default: {
    run: runEnvinfo
  }
}));

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

  it('prints environment info', async () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    await outputInfo();

    const printed = log.mock.calls.flat().join(' ');

    expect(printed).toContain('Environment Info:');
    expect(printed).toContain('System:');
    expect(printed).toContain('22.22.0');
    expect(printed).not.toContain('.nvm');
    expect(printed).not.toContain('Managers:');
    expect(printed).not.toContain('Not Found');
    expect(printed).toContain('@heroui/react');
    expect(printed).toContain('3.0.0');
    expect(printed).toContain('tailwindcss');
    expect(printed).not.toContain('^3.0.0');
    expect(runEnvinfo).toHaveBeenCalledWith(
      expect.objectContaining({
        npmPackages:
          '{@heroui/*,react-aria,react-aria-components,@react-aria/*,@internationalized/date,tailwindcss}'
      }),
      {json: true, showNotFound: false}
    );
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
