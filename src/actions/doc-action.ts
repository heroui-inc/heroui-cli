import chalk from 'chalk';

import {
  findComponentPage,
  loadComponentCatalog,
  loadComponentMarkdown,
  toComponentSlug
} from '@helpers/component-docs';
import {exitWithJson, fail, rethrowIfExit} from '@helpers/json-output';
import {Logger} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';

export async function docAction(component: string) {
  try {
    const pages = await loadComponentCatalog();
    const page = findComponentPage(pages, component);

    if (!page) {
      const match = findMostMatchText(
        pages.map((item) => item.slug),
        toComponentSlug(component)
      );

      const error = match
        ? `Unknown component '${component}', Did you mean '${match}'?`
        : `Unknown component '${component}'`;

      exitWithJson(
        {
          command: 'doc',
          error,
          ok: false,
          ...(match ? {suggestion: match} : {})
        },
        1
      );

      if (match) {
        Logger.error(`Unknown component '${component}', Did you mean '${chalk.underline(match)}'?`);
      } else {
        Logger.error(`Unknown component '${component}'`);
      }

      process.exit(1);
    }

    const markdown = await loadComponentMarkdown(page);

    exitWithJson({command: 'doc', component: page.slug, markdown, ok: true}, 0);
    Logger.log(markdown);
  } catch (error) {
    rethrowIfExit(error);
    fail('doc', `An error occurred while fetching the documentation: ${error}`);
  }

  process.exit(0);
}
