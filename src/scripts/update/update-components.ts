import {store} from 'src/constants/store';

import {initCache} from '../cache/cache';
import {isGithubAction, updateComponents} from '../helpers';

// Won't run on GitHub Actions
if (!isGithubAction) {
  // Force to update cache
  initCache(true);
  // Update beta components
  store.beta = true;
  // Update canary components
  store.canary = true;
  updateComponents({fetchBasic: true});
}
