import fs from 'node:fs';

export interface DocSection {
  name: string;
  files: {relativePath: string}[];
  subsections: DocSection[];
}

export function collectDocFiles(dir: string): {relativePath: string}[] {
  return (fs.readdirSync(dir, {recursive: true}) as string[])
    .filter(
      (f) =>
        (f.endsWith('.mdx') || f.endsWith('.md')) &&
        !f.endsWith('/index.mdx') &&
        !f.endsWith('/index.md') &&
        !f.startsWith('index.')
    )
    .sort()
    .map((f) => ({relativePath: f}));
}

export function collectMigrationDocFiles(dir: string): {relativePath: string}[] {
  return (fs.readdirSync(dir, {recursive: true}) as string[])
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort()
    .map((f) => ({relativePath: f}));
}

export function collectDemoFiles(dir: string): {relativePath: string}[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return (fs.readdirSync(dir, {recursive: true}) as string[])
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('/index.tsx'))
    .sort()
    .map((f) => ({relativePath: f}));
}

export function buildDocTree(files: {relativePath: string}[]): DocSection[] {
  const byDir = new Map<string, DocSection>();

  for (const file of files) {
    const dir = file.relativePath.includes('/')
      ? file.relativePath.slice(0, file.relativePath.lastIndexOf('/'))
      : '.';

    if (!byDir.has(dir)) {
      byDir.set(dir, {files: [], name: dir, subsections: []});
    }

    byDir.get(dir)!.files.push(file);
  }

  const sections = Array.from(byDir.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const section of sections) {
    section.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  return sections;
}

export function collectAllFilesFromSections(sections: DocSection[]): string[] {
  const files: string[] = [];

  for (const section of sections) {
    for (const file of section.files) {
      files.push(file.relativePath);
    }
    files.push(...collectAllFilesFromSections(section.subsections));
  }

  return files;
}

export function groupByDirectory(files: string[], prefix?: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const filePath of files) {
    const lastSlash = filePath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '.' : filePath.slice(0, lastSlash);
    const fileName = lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);

    const key = prefix ? `${prefix}/${dir}` : dir;

    const existing = grouped.get(key);

    if (existing) {
      existing.push(fileName);
    } else {
      grouped.set(key, [fileName]);
    }
  }

  return grouped;
}
