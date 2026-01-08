import {transformPeerVersion} from '@helpers/utils';
import {getConditionComponentData} from 'src/constants/component';
import {compareVersions} from 'src/scripts/helpers';

/**
 * Find the peer package version
 * @param peerPackageName
 * @param isMinVersion default is true
 * @example
 * components: [
 *  {
 *    peerDependencies: {
 *      'react': '18.0.0'
 *    }
 *  },
 *  {
 *    peerDependencies: {
 *      'react': '18.2.0'
 *    }
 *  }
 * ]
 *
 * getPeerPackageVersion('react') --> 18.0.0
 * getPeerPackageVersion('react', false) --> 18.2.0
 */
export function getPeerPackageVersion(peerPackageName: string, isMinVersion = true) {
  const components = getConditionComponentData().components;
  const filerTargetPackages = components.filter(
    (component) => component.peerDependencies[peerPackageName]
  );
  let version = '';

  if (isMinVersion) {
    const versionList = filerTargetPackages.map(
      (component) => component.peerDependencies[peerPackageName]
    );
    const minVersion = versionList.reduce((min, version) => {
      return compareVersions(min, version) > 0 ? version : min;
    });

    version = minVersion || '';
  } else {
    version = filerTargetPackages[0]?.version || '';
  }

  return transformPeerVersion(version);
}
