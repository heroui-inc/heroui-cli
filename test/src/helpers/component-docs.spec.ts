import {
  extractApiReference,
  findComponentPage,
  parseComponentCatalog,
  toComponentSlug
} from '@helpers/component-docs';
import {describe, expect, it} from 'vitest';

const catalog = parseComponentCatalog({
  pages: ['---Components---', 'index', '(buttons)/button', '(buttons)/button-group']
});

const buttonDoc = [
  '## Usage',
  '',
  '```tsx',
  "import { Button } from '@heroui/react';",
  '```',
  '',
  '## API Reference',
  '',
  '### Button',
  '',
  '| Prop | Type |',
  '| `variant` | `string` |',
  '',
  '## Related Components',
  '',
  '- Link'
].join('\n');

describe('component docs', () => {
  it('normalizes component names to slugs', () => {
    expect(toComponentSlug('Button')).toBe('button');
    expect(toComponentSlug('ButtonGroup')).toBe('button-group');
    expect(toComponentSlug(' button_group ')).toBe('button-group');
  });

  it('keeps component pages and drops labels and the index', () => {
    expect(catalog).toEqual([
      {path: '(buttons)/button', slug: 'button'},
      {path: '(buttons)/button-group', slug: 'button-group'}
    ]);
  });

  it('matches a slug exactly', () => {
    expect(findComponentPage(catalog, 'ButtonGroup')?.slug).toBe('button-group');
    expect(findComponentPage(catalog, 'card')).toBeUndefined();
  });

  it('extracts the API Reference section', () => {
    expect(extractApiReference(buttonDoc)).toBe(
      [
        '## API Reference',
        '',
        '### Button',
        '',
        '| Prop | Type |',
        '| `variant` | `string` |'
      ].join('\n')
    );
  });

  it('returns null when the section is missing', () => {
    expect(extractApiReference('## Usage\n\nhello')).toBeNull();
  });
});
