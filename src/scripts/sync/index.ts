import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {resolver} from 'src/constants/path';

interface ApiRoute {
  key: string;
  updated?: boolean;
  routes?: ApiRoute[];
}

interface RoutesConfig {
  routes: ApiRoute[];
}

/**
 * Locale-prefixed root for documentation content in the heroui repo.
 * Docs were moved under `en/` (with a sibling `cn/`) for i18n on the v3 branch.
 */
const DOCS_CONTENT_ROOT = 'apps/docs/content/docs/en';

/**
 * Checkout of the heroui repo to sync into. Defaults to a sibling `heroui/`
 * directory inside the current working directory.
 */
const HEROUI_REPO = process.env['HEROUI_REPO_PATH'] ?? 'heroui';

function readTarget(path: string, description: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `Cannot sync ${description}: "${path}" does not exist. Check out the heroui repo next to this one, or point HEROUI_REPO_PATH at it.`
    );
  }

  return readFileSync(path, 'utf-8');
}

export function syncDocs() {
  const docs = readFileSync(resolver('README.md'), 'utf-8');
  const matchDocs = docs.match(/(?<=Usage: heroui \[command]\n\n)[\W\w]+(?=## Documentation)/)?.[0];

  const targetPath = resolver(`${HEROUI_REPO}/${DOCS_CONTENT_ROOT}/api-references/cli-api.mdx`);
  const targetDocs = readTarget(targetPath, 'the CLI API reference');
  const replaceTargetDocs = targetDocs.replace(/(?<=Usage: heroui \[command])[\W\w]+/, '');
  let writeDocs = `${replaceTargetDocs}\n\n${matchDocs?.replace(/\n$/, '')}`;

  writeDocs = writeDocs.replaceAll(/```bash/g, '```codeBlock bash');

  writeFileSync(targetPath, writeDocs, 'utf-8');

  syncApiRoutes();
}

function syncApiRoutes() {
  const targetPath = resolver(`${HEROUI_REPO}/apps/docs/config/routes.json`);
  const targetDocs = JSON.parse(readTarget(targetPath, 'the docs routes config')) as RoutesConfig;

  targetDocs.routes.forEach((route) => {
    if (route.key === 'api-references') {
      route.routes?.forEach((apiRoute) => {
        if (apiRoute.key === 'cli-api') {
          apiRoute.updated = true;
        }
      });
    }
  });

  writeFileSync(targetPath, `${JSON.stringify(targetDocs, null, 2)}\n`, 'utf-8');
}
