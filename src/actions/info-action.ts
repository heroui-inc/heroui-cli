import chalk from 'chalk';

import {
  componentDocsUrl,
  extractApiReference,
  findComponentPage,
  loadComponentCatalog,
  loadComponentMarkdown,
  toComponentSlug
} from '@helpers/component-docs';
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
      Logger.error(
        `No API Reference section found for '${page.slug}'. See ${componentDocsUrl(page.slug)}`
      );
      process.exit(1);
    }

    Logger.log(section);
  } catch (error) {
    Logger.prefix('error', `An error occurred while fetching the API reference: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}
