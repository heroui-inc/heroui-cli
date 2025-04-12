import type {RequiredKey, SAFE_ANY} from '@helpers/type';
import type {Dependencies} from 'src/scripts/helpers';

export interface Upgrade {
  isHeroUIAll: boolean;
  allDependencies?: Record<string, SAFE_ANY>;
  upgradeOptionList?: UpgradeOption[];
  all?: boolean;
}

export type ExtractUpgrade<T extends Upgrade> = T extends {isHeroUIAll: infer U}
  ? U extends true
    ? RequiredKey<Upgrade, 'allDependencies' | 'all'>
    : RequiredKey<Upgrade, 'upgradeOptionList'>
  : T;

export type MissingDepSetType = {
  name: string;
  version: string;
};

export interface UpgradeOption {
  package: string;
  version: string;
  latestVersion: string;
  isLatest: boolean;
  versionMode: string;
  peerDependencies?: Dependencies;
}
