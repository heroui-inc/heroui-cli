import type {EnvOptions} from '@helpers/type';

import {outputComponents, outputInfo} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';

export async function envAction(options: EnvOptions) {
  const {packagePath = resolver('package.json'), json} = options as EnvOptions & {json?: boolean};

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (json) {
    const packages = installed.length
      ? (await transformPackageDetail([...installed], allDependencies)).map((c) => ({
          package: c.package,
          version: c.version.replace(/\s*new:\s*/, ' -> ').trim(),
          status: c.status,
          docs: c.docs
        }))
      : [];

    const output = {
      packages,
      environment: {
        os: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  if (installed.length) {
    const components = await transformPackageDetail([...installed], allDependencies);

    outputComponents({components, warnError: false});
  }

  outputInfo();

  process.exit(0);
}
