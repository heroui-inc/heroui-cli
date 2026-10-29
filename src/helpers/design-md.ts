import fs from 'node:fs';
import path from 'node:path';

export type DesignPlatform = 'react' | 'native';

export function designMdUrl(selection: DesignPlatform): string {
  return `https://heroui.com/${selection}/DESIGN.md`;
}

export async function downloadDesignMd(sourceUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const content = Buffer.from(await response.arrayBuffer());
    const text = content.toString('utf-8');
    const contentType = response.headers.get('content-type') ?? '';

    if (!text.trim()) {
      throw new Error('The response is empty; expected Markdown.');
    }

    if (
      /\b(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType) ||
      /^\s*(?:<!doctype\s+html\b|<html\b)/i.test(text)
    ) {
      throw new Error('The response is HTML; expected Markdown.');
    }

    return content;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to download ${sourceUrl}: ${reason}`);
  }
}

/** Stage beside the destination so replacement stays on the same filesystem. */
export function writeDesignMd(outputFile: string, content: Buffer): void {
  const directory = path.dirname(outputFile);

  fs.mkdirSync(directory, {recursive: true});
  const staging = fs.mkdtempSync(path.join(directory, '.heroui-design-md-'));

  try {
    const stagedFile = path.join(staging, 'DESIGN.md');

    fs.writeFileSync(stagedFile, content);
    fs.renameSync(stagedFile, outputFile);
  } finally {
    fs.rmSync(staging, {force: true, recursive: true});
  }
}
