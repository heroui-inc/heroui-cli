import type {SAFE_ANY} from '@helpers/type';

import {fetchRequest} from '@helpers/fetch';

export async function fetchPackage(pkgFile: string) {
  let pkgContent: SAFE_ANY;

  const response = await fetchRequest(pkgFile);

  try {
    pkgContent = JSON.parse(await response.text());
    // eslint-disable-next-line no-empty
  } catch {}

  return pkgContent;
}
