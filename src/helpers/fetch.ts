import {basename} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

import retry from 'async-retry';
import chalk from 'chalk';
import ora from 'ora';
import tar from 'tar';

/**
 * Fetch the tar stream from the specified URL.
 * @param url
 */
async function fetchTarStream(url: string) {
  const res = await fetch(url);

  if (!res.body) {
    throw new Error(`Failed to download: ${url}`);
  }

  return Readable.fromWeb(res.body);
}

/**
 * Download the template from the specified URL and extract it to the specified directory.
 * @param root
 * @param url
 */
export async function downloadTemplate(root: string, url: string) {
  await retry(
    async (bail) => {
      try {
        await pipeline(
          await fetchTarStream(url),
          tar.x({
            cwd: root
          })
        );
      } catch (error) {
        bail(new Error(`Failed to download ${url} Error: ${error}`));
      }
    },
    {
      retries: 3
    }
  );
}

export async function fetchRequest(
  url: string,
  options?: RequestInit & {fetchInfo?: string; throwError?: boolean}
): Promise<Response> {
  const {fetchInfo, throwError = true, ...rest} = options ?? {};
  const text = `Fetching ${fetchInfo ?? basename(url)}`;
  const spinner = ora({
    discardStdin: false,
    spinner: {
      frames: [
        `⠋ ${chalk.gray(`${text}.`)}`,
        `⠙ ${chalk.gray(`${text}..`)}`,
        `⠹ ${chalk.gray(`${text}...`)}`,
        `⠸ ${chalk.gray(`${text}.`)}`,
        `⠼ ${chalk.gray(`${text}..`)}`,
        `⠴ ${chalk.gray(`${text}...`)}`,
        `⠦ ${chalk.gray(`${text}.`)}`,
        `⠧ ${chalk.gray(`${text}..`)}`,
        `⠇ ${chalk.gray(`${text}...`)}`,
        `⠏ ${chalk.gray(`${text}.`)}`
      ],
      interval: 150
    }
  });

  spinner.start();

  try {
    return await retry(
      async () => {
        const response = await fetch(url, {
          ...rest,
          headers: {
            Accept: 'application/json',
            ...rest?.headers
          }
        });

        if (!response.ok && throwError) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response;
      },
      {
        retries: 2
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch failed')) {
      throw new Error('Connection failed. Please check your network connection.');
    }

    throw error;
  } finally {
    spinner.stop();
  }
}
