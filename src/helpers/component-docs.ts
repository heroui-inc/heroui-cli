import {cacheData, getCacheData, isExpired} from 'src/scripts/cache/cache';

const DOCS_CONTENT_URL =
  'https://raw.githubusercontent.com/heroui-inc/heroui/v3/apps/docs/content/docs/en/react/components';

const CATALOG_URL = `${DOCS_CONTENT_URL}/meta.json`;
const CATALOG_CACHE_KEY = 'docs:react:components:meta';

export interface ComponentPage {
  path: string;
  slug: string;
}

interface ComponentCatalog {
  pages?: string[];
}

/**
 * Normalize a component argument to the docs slug.
 * @example toComponentSlug('ButtonGroup') // 'button-group'
 */
export function toComponentSlug(input: string): string {
  return input
    .trim()
    .replace(/([\da-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function componentDocsUrl(slug: string): string {
  return `https://heroui.com/docs/react/components/${slug}`;
}

/**
 * Keep component pages from the docs catalog and drop section labels and the index.
 */
export function parseComponentCatalog(catalog: ComponentCatalog): ComponentPage[] {
  return (catalog.pages ?? [])
    .filter((page) => page !== 'index' && !page.startsWith('---'))
    .map((page) => {
      const slug = page.includes('/') ? page.slice(page.lastIndexOf('/') + 1) : page;

      return {path: page, slug};
    });
}

export function findComponentPage(
  pages: ComponentPage[],
  input: string
): ComponentPage | undefined {
  const slug = toComponentSlug(input);

  return pages.find((page) => page.slug === slug);
}

/**
 * Return the API Reference section, from its heading through the line before the next h2.
 */
export function extractApiReference(markdown: string): string | null {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === '## API Reference');

  if (start === -1) {
    return null;
  }

  let end = lines.length;

  for (let index = start + 1; index < lines.length; index++) {
    if (lines[index]?.startsWith('## ')) {
      end = index;
      break;
    }
  }

  const section = lines.slice(start, end).join('\n').trim();

  return section || null;
}

function pageCacheKey(slug: string): string {
  return `docs:react:components:${slug}`;
}

function pageUrl(page: ComponentPage): string {
  return `${DOCS_CONTENT_URL}/${page.path}.mdx`;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function loadCached(key: string, url: string): Promise<string> {
  const data = getCacheData();

  if (!isExpired(key, data)) {
    const cached = data[key]?.execResult;

    if (typeof cached === 'string') {
      return cached;
    }
  }

  const text = await fetchText(url);

  cacheData(key, {execResult: text}, data);

  return text;
}

export async function loadComponentCatalog(): Promise<ComponentPage[]> {
  const raw = await loadCached(CATALOG_CACHE_KEY, CATALOG_URL);

  return parseComponentCatalog(JSON.parse(raw) as ComponentCatalog);
}

export async function loadComponentMarkdown(page: ComponentPage): Promise<string> {
  return loadCached(pageCacheKey(page.slug), pageUrl(page));
}
