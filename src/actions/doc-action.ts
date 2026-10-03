import chalk from 'chalk';

import {
  findComponentPage,
  loadComponentCatalog,
  loadComponentMarkdown,
  toComponentSlug
} from '@helpers/component-docs';
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

      if (match) {
        Logger.error(`Unknown component '${component}', Did you mean '${chalk.underline(match)}'?`);
      } else {
        Logger.error(`Unknown component '${component}'`);
      }

      process.exit(1);
    }

    const markdown = await loadComponentMarkdown(page);

    Logger.log(markdown);
  } catch (error) {
    Logger.prefix('error', `An error occurred while fetching the documentation: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}
