import {getCacheExecData} from 'src/scripts/cache/cache';

import {safeJsonParse} from './utils';

/**
 * Collect the peer dependencies declared by `packages`, de-duplicated across
 * them and in declaration order.
 *
 * doctor, install and upgrade each need this list and each reimplemented the
 * fetch, parse and de-duplication, which is where they drifted apart. What
 * they do with the result still differs, so only the collection is shared.
 *
 * @param packages Packages whose peer dependencies should be read
 * @param exclude Peer names to skip, e.g. the HeroUI packages themselves
 */
export async function collectPeerDependencies(
  packages: readonly string[],
  exclude: readonly string[] = []
): Promise<[string, string][]> {
  const excluded = new Set(exclude);
  const seen = new Set<string>();
  const collected: [string, string][] = [];

  for (const pkg of packages) {
    const raw = await getCacheExecData(`npm show ${pkg} peerDependencies --json`);
    const peerDeps = safeJsonParse<Record<string, string>>(raw, {});

    for (const [peerPkg, peerRange] of Object.entries(peerDeps)) {
      if (excluded.has(peerPkg) || seen.has(peerPkg)) {
        continue;
      }
      seen.add(peerPkg);
      collected.push([peerPkg, peerRange]);
    }
  }

  return collected;
}
