<p align="center">
  <a href="https://heroui.com">
      <img width="20%" src="https://raw.githubusercontent.com/heroui-inc/heroui/main/apps/docs/public/isotipo.png" alt="nextui" />
      <h1 align="center">@heroui/codemod</h1>
  </a>
</p>

</br>

The CLI provides a comprehensive suite of tools to migrate your codebase from NextUI to HeroUI.

## Quick Start

> **Note**: The heroui CLI requires [Node.js](https://nodejs.org/en) _18.17.x_ or later
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

A CLI tool for migrating your codebase to heroui

Arguments:
  codemod                Specify which codemod to run
                         Codemods: import-heroui, package-json-package-name, heroui-provider, tailwindcss-heroui, css-variables, npmrc

Options:
  -v, --version          Output the current version
  -d, --debug            Enable debug mode
  -h, --help             Display help for command
  -f, --format           Format the affected files with Prettier

Commands:
  migrate [projectPath] Migrate your codebase to use heroui
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

Updates all package names in `package.json` from `@nextui-org/*` to `@heroui/*`.

```bash
heroui-codemod package-json-package-name
```

Example:

1. `@nextui-org/button: x.xx.xxx` to `@heroui/button: x.xx.xxx`

### heroui-provider

Migrate `NextUIProvider` to `HeroProvider`.

```bash
heroui-codemod heroui-provider
```

Example:

1. `import { NextUIProvider } from "@nextui-org/react"` to `import { HeroProvider } from "@heroui/react"`

2. `<NextUIProvider>...</NextUIProvider>` to `<HeroProvider>...</HeroProvider>`

### tailwindcss-heroui

Migrate all the `tailwind.config.(j|t)s` file to use the `@heroui` package.

```bash
heroui-codemod tailwindcss-heroui
```

Example:

1. `const {nextui} = require('@nextui-org/theme')` to `const {heroui} = require('@heroui/theme')`

2. `plugins: [nextui({...})]` to `plugins: [heroui({...})]`

3. `content: ['./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}']` to `content: ['./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}']`

4. `var(--nextui-primary-500)` to `var(--heroui-primary-500)`

### css-variables

Migrate all the css variables in the file starting with `--nextui-` to `--heroui-`.

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

Migrate your entire codebase from NextUI to heroui. You can choose which codemods to run during the migration process.

```bash
heroui-codemod migrate [projectPath] [--format]
```

Example:

```bash
heroui-codemod migrate ./my-nextui-app
```

Output:

```bash
heroui Codemod v0.0.1

┌   Starting to migrate nextui to heroui
│
◇  1. Migrating "package.json"
│
◇  Do you want to migrate package.json?
│  Yes
│
◇  Migrated package.json
│
◇  2. Migrating import "nextui" to "heroui"
│
◇  Do you want to migrate import nextui to heroui?
│  Yes
│
◇  Migrated import nextui to heroui
│
◇  3. Migrating "NextUIProvider" to "HeroUIProvider"
│
◇  Do you want to migrate NextUIProvider to HeroUIProvider?
│  Yes
│
◇  Migrated NextUIProvider to HeroUIProvider
│
◇  4. Migrating "tailwindcss"
│
◇  Do you want to migrate tailwindcss?
│  Yes
│
◇  Migrated tailwindcss
│
◇  5. Migrating "css variables"
│
◇  Do you want to migrate css variables?
│  Yes
│
◇  Migrated css variables
│
◇  6. Migrating "npmrc" (Pnpm only)
│
◇  Do you want to migrate npmrc (Pnpm only) ?
│  Yes
│
◇  Migrated npmrc
│
└  ✅ Migration completed!
```

### Community

We're excited to see the community adopt NextUI CLI, raise issues, and provide feedback.
Whether it's a feature request, bug report, or a project to showcase, please get involved!

- [Discord](https://discord.gg/9b6yyZKmH4)
- [Twitter](https://twitter.com/getnextui)
- [GitHub Discussions](https://github.com/nextui-org/nextui-cli/discussions)

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](https://github.com/nextui-org/nextui-cli/blob/main/CONTRIBUTING.md) for ways to get started.

Please adhere to this project's [CODE_OF_CONDUCT](https://github.com/nextui-org/nextui-cli/blob/main/CODE_OF_CONDUCT.md).

## License

[MIT](https://choosealicense.com/licenses/mit/)
