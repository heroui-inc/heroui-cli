import {transformPeerVersion} from '@helpers/utils';
import {getComponentData} from 'src/constants/component';
import {compareVersions} from 'src/scripts/helpers';

/**
 * Find the peer package version
 * @param peerPackageName
 * @param isMinVersion default is true
 */
export function getPeerPackageVersion(peerPackageName: string, isMinVersion = true) {
  const components = getComponentData().components;
  const filerTargetPackages = components.filter(
    (component) => component.peerDependencies[peerPackageName]
  );
  let version = '';

  if (isMinVersion) {
    const minVersionList = filerTargetPackages.map(
      (component) => component.peerDependencies[peerPackageName]
    );
    const minVersion = minVersionList.reduce((min, version) => {
      return compareVersions(min, version) > 0 ? version : min;
    });

    version = minVersion || '';
  } else {
    version = filerTargetPackages[0]?.version || '';
  }

  return transformPeerVersion(version);
}
