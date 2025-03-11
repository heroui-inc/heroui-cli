import {readFileSync, writeFileSync} from 'node:fs';

import {resolver} from 'src/constants/path';

export function syncDocs() {
  const docs = readFileSync(resolver('README.md'), 'utf-8');
  const matchDocs = docs.match(/(?<=Usage: heroui \[command]\n\n)[\W\w]+(?=## Documentation)/)?.[0];

  const targetPath = resolver('heroui/apps/docs/content/docs/api-references/cli-api.mdx');
  const targetDocs = readFileSync(targetPath, 'utf-8');
  const replaceTargetDocs = targetDocs.replace(/(?<=Usage: heroui \[command])[\W\w]+/, '');
  let writeDocs = `${replaceTargetDocs}\n\n${matchDocs?.replace(/\n$/, '')}`;

  writeDocs = writeDocs.replaceAll(/```bash/g, '```codeBlock bash');

  writeFileSync(targetPath, writeDocs, 'utf-8');

  syncApiRoutes();
}

function syncApiRoutes() {
  const targetPath = resolver('heroui/apps/docs/config/routes.json');
  const targetDocs = JSON.parse(readFileSync(targetPath, 'utf-8'));

  targetDocs.routes.forEach((route) => {
    if (route.key === 'api-references') {
      route.routes.forEach((apiRoute) => {
        if (apiRoute.key === 'cli-api') {
          apiRoute.updated = true;
        }
      });
    }
  });

  writeFileSync(targetPath, JSON.stringify(targetDocs, null, 2), 'utf-8');
}
