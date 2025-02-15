import {getPackageVersionData} from '@helpers/beta';

import {getSelect} from './index';

export async function getBetaVersionSelect(components: string[]) {
  const result: string[] = [];

  for (const component of components) {
    const betaVersionData = JSON.parse(await getPackageVersionData(component));

    const selectedResult = await getSelect(
      `Select beta version of ${component}`,
      Object.values(betaVersionData).map((value) => {
        const betaVersion = `${component}@${value}`;

        return {
          title: betaVersion,
          value: betaVersion
        };
      })
    );

    result.push(selectedResult);
  }

  return result;
}
