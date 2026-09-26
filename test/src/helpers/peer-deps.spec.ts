import {collectPeerDependencies} from '@helpers/peer-deps';
import {describe, expect, it, vi} from 'vitest';

const getCacheExecData = vi.hoisted(() => vi.fn());

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

describe('collectPeerDependencies', () => {
  it('de-duplicates peers and skips excluded names', async () => {
    getCacheExecData.mockImplementation(async (cmd: string) => {
      if (cmd.includes('@heroui/react')) {
        return JSON.stringify({'@heroui/styles': '^3.0.0', react: '>=19.0.0'});
      }

      return JSON.stringify({react: '>=19.0.0', typescript: '^5.0.0'});
    });

    await expect(
      collectPeerDependencies(['@heroui/react', '@heroui/styles'], ['@heroui/styles'])
    ).resolves.toEqual([
      ['react', '>=19.0.0'],
      ['typescript', '^5.0.0']
    ]);
  });

  it('ignores invalid peer JSON', async () => {
    getCacheExecData.mockResolvedValueOnce('not-json');

    await expect(collectPeerDependencies(['@heroui/react'])).resolves.toEqual([]);
  });
});
