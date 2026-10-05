import {getCacheExecData} from 'src/scripts/cache/cache';
import {getLatestVersion} from 'src/scripts/helpers';

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

/**
 * Resolve the highest published version satisfying a peer range.
 *
 * Installing the `latest` dist-tag instead can violate the range the package
 * actually declares. The spec is quoted because ranges contain characters the
 * shell would otherwise interpret, and the resolved value is a plain version
 * so it stays safe to interpolate into the install command.
 */
export async function resolvePeerVersion(pkg: string, range: string): Promise<string> {
  const raw = await getCacheExecData(
    `npm view ${JSON.stringify(`${pkg}@${range}`)} version --json`
  );
  const parsed = safeJsonParse<string | string[] | undefined>(raw, undefined);
  const resolved = Array.isArray(parsed) ? parsed.at(-1) : parsed;

  if (typeof resolved === 'string' && resolved) {
    return resolved;
  }

  return getLatestVersion(pkg);
}
