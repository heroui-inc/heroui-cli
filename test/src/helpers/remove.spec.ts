import {removeDependencies} from '@helpers/remove';
import {describe, expect, it, vi} from 'vitest';

const exec = vi.hoisted(() => vi.fn(async () => ''));

vi.mock('@helpers/exec', () => ({
  exec
}));

describe('removeDependencies', () => {
  it('uninstalls with the package manager command', async () => {
    await removeDependencies(['@heroui/react', '@heroui/styles'], 'pnpm');
    await removeDependencies(['@heroui/react'], 'npm');

    expect(exec).toHaveBeenNthCalledWith(1, 'pnpm remove @heroui/react @heroui/styles');
    expect(exec).toHaveBeenNthCalledWith(2, 'npm uninstall @heroui/react');
  });
});
