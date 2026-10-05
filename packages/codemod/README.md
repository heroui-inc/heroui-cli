<p align="center">
  <a href="https://heroui.com">
      <img width="20%" src="https://raw.githubusercontent.com/heroui-inc/heroui/v3/apps/docs/public/icons/readme-logo.png" alt="heroui" />
      <h1 align="center">@heroui/codemod</h1>
  </a>
</p>

<br />

The CLI provides a comprehensive suite of tools to migrate your codebase from NextUI to HeroUI. It renames `@nextui-org/*` packages and APIs to `@heroui/*`. It does not upgrade a project to HeroUI v3. For the v3 migration guides, run `heroui agents-md --migration`.

## Quick Start

> **Note**: `@heroui/codemod` requires [Node.js](https://nodejs.org/en) 22.22.0 or later
>
> **Note**: If running in monorepo, you need to run the command in the root of your monorepo

You can start using @heroui/codemod in one of the following ways:

### Npx

```bash
npx @heroui/codemod@latest
```

### Global Installation

```bash
npm install -g @heroui/codemod
```

## Usage

```bash
Usage: @heroui/codemod [command]

HeroUI Codemod provides transformations to help migrate your codebase from NextUI to HeroUI

Arguments:
  codemod                Specify which codemod to run
                         Codemods: import-heroui, package-json-package-name, heroui-provider, tailwindcss-heroui, css-variables, npmrc

Options:
  -v, --version          Output the current version
  -d, --debug            Enable debug mode
  -h, --help             Display help for command
  -f, --format           Format the affected files with Prettier

Commands:
  migrate [projectPath] Migrates your codebase to use the heroui
```

## Codemod Arguments

### import-heroui

Updates all import statements from `@nextui-org/*` packages to their `@heroui/*` equivalents.

```bash
heroui-codemod import-heroui
```

Example:

1. `import { Button } from "@nextui-org/button"` to `import { Button } from "@heroui/button"`

### package-json-package-name

Renames `@nextui-org/*` entries in `dependencies` and `devDependencies` to `@heroui/*`, and sets each version to the latest release. If that lookup fails, the version is set to `latest`.

```bash
heroui-codemod package-json-package-name
```

Example:

1. `"@nextui-org/button": "2.4.8"` to `"@heroui/button": "<latest>"`

### heroui-provider

Migrate `NextUIProvider` to `HeroUIProvider`.

```bash
heroui-codemod heroui-provider
```

Example:

1. `import { NextUIProvider } from "@nextui-org/react"` to `import { HeroUIProvider } from "@heroui/react"`

2. `<NextUIProvider>...</NextUIProvider>` to `<HeroUIProvider>...</HeroUIProvider>`

### tailwindcss-heroui

Updates `tailwind.config.js` and `tailwind.config.ts` to use the `@heroui` package.

```bash
heroui-codemod tailwindcss-heroui
```

Example:

1. `const {nextui} = require('@nextui-org/theme')` to `const {heroui} = require('@heroui/theme')`

2. `plugins: [nextui({...})]` to `plugins: [heroui({...})]`

3. `content: ['./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}']` to `content: ['./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}']`

### css-variables

Rewrites CSS variables that start with `--nextui-` to `--heroui-` in the scanned source files.

```bash
heroui-codemod css-variables
```

Example:

1. `className="text-[var(--nextui-primary-500)]"` to `className="text-[var(--heroui-primary-500)]"`

### npmrc (Pnpm only)

Migrate the `.npmrc` file to use the `@heroui` package.

```bash
heroui-codemod npmrc
```

Example:

1. `public-hoist-pattern[]=*@nextui-org/theme*` to `public-hoist-pattern[]=*@heroui/theme*`

## Migrate Command

Migrate your entire codebase from NextUI to HeroUI. Each step asks before it changes files.

```bash
heroui-codemod migrate [projectPath] [--format]
```

Example:

```bash
heroui-codemod migrate ./my-nextui-app
```

The npmrc step runs only for pnpm. Remaining `@nextui-org` references are offered when any are left. Formatting is offered unless you pass `--format`, which formats without asking. Dependencies are reinstalled only after `package.json` changes.

Output:

```bash
HeroUI Codemod <version>

┌  Starting to migrate NextUI to HeroUI
│
◇  1. Migrating "package.json"
│
◇  Do you want to migrate package.json?
│  Yes
│
◇  2. Migrating import "nextui" to "heroui"
│
◇  Do you want to migrate import nextui to heroui?
│  Yes
│
◇  3. Migrating "NextUIProvider" to "HeroUIProvider"
│
◇  Do you want to migrate NextUIProvider to HeroUIProvider?
│  Yes
│
◇  4. Migrating "tailwindcss"
│
◇  Do you want to migrate tailwindcss?
│  Yes
│
◇  5. Migrating "css variables"
│
◇  Do you want to migrate css variables?
│  Yes
│
◇  6. Migrating "npmrc" (Pnpm only)
│
◇  Do you want to migrate npmrc (Pnpm only) ?
│  Yes
│
◇  7. Remaining files with "@nextui-org" (1)
│
│  src/theme.ts
│
◇  Do you want to replace all remaining instances of "@nextui-org" with "@heroui"?
│  Yes
│
◇  8. Formatting affected files (Optional)
│
◇  Do you want to format affected files? (12)
│  Yes
│
◇  9. Reinstalling the dependencies
│
◇  Do you want to reinstall the dependencies?
│  Yes
│
└  ✅ Migration completed!
```

### Community

We're excited to see the community adopt HeroUI CLI, raise issues, and provide feedback.
Whether it's a feature request, bug report, or a project to showcase, please get involved!

- [Discord](https://discord.gg/9b6yyZKmH4)
- [X](https://x.com/hero_ui)
- [GitHub Discussions](https://github.com/heroui-inc/heroui-cli/discussions)

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](https://github.com/heroui-inc/heroui-cli/blob/main/CONTRIBUTING.md) for ways to get started.

Please adhere to this project's [CODE_OF_CONDUCT](https://github.com/heroui-inc/heroui-cli/blob/main/CODE_OF_CONDUCT.md).

## License

[MIT](https://github.com/heroui-inc/heroui-cli/blob/main/license)
