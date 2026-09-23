import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

import retry from 'async-retry';
import * as tar from 'tar';

/**
 * Fetch the tar stream from the specified URL.
 * @param url
 */
async function fetchTarStream(url: string) {
  const res = await fetch(url);

  // Without this an error page is piped straight into `tar.x`, which then fails
  // with an unrelated "unexpected end of file" instead of the real cause
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error(`Failed to download: ${url}`);
  }

  return Readable.fromWeb(res.body);
}

/**
 * Download the template from the specified URL and extract it to the specified directory.
 * Retries up to 3 times for transient network errors.
 * @param root
 * @param url
 */
export async function downloadTemplate(root: string, url: string) {
  await retry(
    async () => {
      await pipeline(
        await fetchTarStream(url),
        tar.x({
          cwd: root
        })
      );
    },
    {
      retries: 3
    }
  );
}
