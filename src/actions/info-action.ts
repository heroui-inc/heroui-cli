import chalk from 'chalk';

import {
  componentDocsUrl,
  extractApiReference,
  findComponentPage,
  loadComponentCatalog,
  loadComponentMarkdown,
  toComponentSlug
} from '@helpers/component-docs';
import {exitWithJson, fail, rethrowIfExit} from '@helpers/json-output';
import {Logger} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';

export async function infoAction(component: string) {
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
          command: 'info',
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
    const section = extractApiReference(markdown);

    if (!section) {
      const error = `No API Reference section found for '${page.slug}'. See ${componentDocsUrl(page.slug)}`;

      exitWithJson({command: 'info', error, ok: false}, 1);
      Logger.error(error);
      process.exit(1);
    }

    exitWithJson({api: section, command: 'info', component: page.slug, ok: true}, 0);
    Logger.log(section);
  } catch (error) {
    rethrowIfExit(error);
    fail('info', `An error occurred while fetching the API reference: ${error}`);
  }

  process.exit(0);
}
