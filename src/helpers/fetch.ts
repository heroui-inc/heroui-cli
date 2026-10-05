import {mkdtempSync, readdirSync, renameSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

import retry from 'async-retry';
import {join} from 'pathe';
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
      // Extract into a private directory. A retry must not merge a second
      // tarball into files left behind by a failed attempt.
      const staging = mkdtempSync(join(tmpdir(), 'heroui-template-'));
      const moved: string[] = [];

      try {
        await pipeline(
          await fetchTarStream(url),
          tar.x({
            cwd: staging
          })
        );

        for (const entry of readdirSync(staging)) {
          const destination = join(root, entry);

          rmSync(destination, {force: true, recursive: true});
          renameSync(join(staging, entry), destination);
          moved.push(destination);
        }
      } catch (error) {
        for (const destination of moved) {
          rmSync(destination, {force: true, recursive: true});
        }

        throw error;
      } finally {
        rmSync(staging, {force: true, recursive: true});
      }
    },
    {
      retries: 3
    }
  );
}
