<p align="center">
  <a href="https://heroui.com">
      <img width="20%" src="https://raw.githubusercontent.com/heroui-inc/heroui/v3/apps/docs/public/icons/readme-logo.png" alt="heroui (previously nextui)" />
      <h1 align="center">HeroUI CLI (Previously NextUI CLI)</h1>
  </a>
</p>
</br>
<p align="center">
  <a href="https://github.com/heroui-inc/heroui-cli/blob/main/license">
    <img src="https://img.shields.io/npm/l/heroui-cli?style=flat" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/heroui-cli">
    <img src="https://img.shields.io/npm/dm/heroui-cli.svg?style=flat-round" alt="npm downloads">
  </a>
</p>

The CLI offers a suite of commands to initialize, manage, and improve your HeroUI projects. It enables you to `install`, `uninstall`, or `upgrade` HeroUI packages, assess the health of your project, and more.

## Quick Start

> **Note**: The HeroUI CLI requires [Node.js](https://nodejs.org/en) _22+_ or later

You can choose the following ways to start the HeroUI CLI.

### Npx

```bash
npx heroui-cli@latest
```

### Global Installation

```bash
npm install -g heroui-cli
```

## Usage

```bash
Usage: heroui [command]

Options:
  -v, --version                  Output the current version
  --no-cache                     Disable cache, by default data will be cached for 30m after the first request
  -d, --debug                    Debug mode will not install dependencies
  -h --help                      Display help information for commands

Commands:
  init [options] [projectName]   Initializes a new project
  install [options]              Installs @heroui/react and @heroui/styles in your project
  upgrade [options]              Upgrades @heroui/react and @heroui/styles to the latest versions
  uninstall [options]            Uninstalls @heroui/react and @heroui/styles from the project
  list [options]                 Lists installed HeroUI packages (@heroui/react, @heroui/styles)
  env [options]                  Displays debugging information for the local environment
  doctor [options]               Checks for issues in the project
  agents-md [options]            Downloads HeroUI documentation for AI coding agents
  help [command]                 Display help for command
```

## Analytics

The `agents-md` command collects anonymous usage data.

**What we collect:** Selection (react/native/both), output file names, duration, success or error. No file paths, or project contents are collected.

**Opt out:** Set `HEROUI_ANALYTICS_DISABLED=1` in your environment or shell profile.

## Commands

### Init

Initialize a new HeroUI project with official templates.

```bash
heroui init [projectName] [options]
```

#### Init Options

- `-t --template [string]` The template to use for the new project e.g. app, laravel, pages, remix, vite
- `-p --package [string]` The package manager to use for the new project (default: `npm`)

##### Example

```bash
# Initialize a new HeroUI project with the app template, named my-heroui-app
heroui init my-heroui-app -t app
```

output:

```bash
HeroUI CLI <version>

┌  Create a new project
│
◇  Select a template (Enter to select)
│  ● App (A Next.js 16 with app directory template pre-configured with HeroUI (v3) and Tailwind CSS.)
│  ○ Pages (A Next.js 16 with pages directory template pre-configured with HeroUI (v3) and Tailwind CSS.)
│  ○ Vite (A Vite template pre-configured with HeroUI (v3) and Tailwind CSS.)
│
◇  New project name (Enter to skip with default name)
│  my-heroui-app
│
◇  Select a package manager (Enter to select)
│  ● npm
│  ○ yarn
│  ○ pnpm
│  ○ bun
│
◇  Template created successfully!
│
◇  Next steps ───────╮
│                    │
│  cd my-heroui-app  │
│  npm install       │
│                    │
├────────────────────╯
│
└  🚀 Get started with npm run dev
```

### Install

Install `@heroui/react` and `@heroui/styles` in your project, along with their peer dependencies. If they are already installed, the command does nothing.

```bash
heroui install [options]
```

#### Install Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui install
```

Output:

```bash
HeroUI CLI <version>

📦 Packages to be installed:
╭─────────────────────────────────────────────────────────────────────────────╮
│   Package          │   Version        │   Status   │   Docs                 │
│─────────────────────────────────────────────────────────────────────────────│
│   @heroui/react    │   3.0.0          │   stable   │   https://heroui.com   │
│   @heroui/styles   │   3.0.0          │   stable   │   https://heroui.com   │
╰─────────────────────────────────────────────────────────────────────────────╯

╭─────────────── PeerDependencies ────────────────╮
│  react@18.3.1                      latest       │
│  react-dom@18.3.1                  latest       │
│  tailwindcss@4.2.2                 latest       │
╰─────────────────────────────────────────────────╯
? Proceed with installation? › - Use arrow-keys. Return to submit.
❯   Yes
    No

✅ @heroui/react and @heroui/styles installed successfully
```

### Upgrade

Upgrade `@heroui/react` and `@heroui/styles` with their peer dependencies to the latest versions.

```bash
heroui upgrade [options]
```

#### Upgrade Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui upgrade
```

Output:

```bash
HeroUI CLI <version>

╭──────────────────────────── Upgrade ────────────────────────────╮
│  @heroui/react               ^3.0.0  ->  ^3.1.0                │
│  @heroui/styles              ^3.0.0  ->  ^3.1.0                │
╰─────────────────────────────────────────────────────────────────╯

? Would you like to proceed with the upgrade? › - Use arrow-keys. Return to submit.
❯   Yes
    No

✅ Upgrade complete. All packages are up to date.
```

### Uninstall

Uninstall `@heroui/react` and `@heroui/styles` from your project. Peer dependencies will not be deleted.

```bash
heroui uninstall [options]
```

#### Uninstall Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui uninstall
```

Output:

```bash
HeroUI CLI <version>

❗️ Packages slated for uninstallation:
╭──────────────────────────────────────────────────────────────────────────────────────╮
│   Package          │   Version   │   Status   │   Docs                               │
│──────────────────────────────────────────────────────────────────────────────────────│
│   @heroui/react    │   3.0.0     │   stable   │   https://heroui.com                 │
│   @heroui/styles   │   3.0.0     │   stable   │   https://heroui.com                 │
╰──────────────────────────────────────────────────────────────────────────────────────╯
? Confirm uninstallation of these packages: › - Use arrow-keys. Return to submit.
❯   Yes
    No

✅ Successfully uninstalled: @heroui/react, @heroui/styles
```

### List

List the installed HeroUI packages (`@heroui/react`, `@heroui/styles`).

```bash
heroui list [options]
```

#### List Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui list
```

Output:

```bash
HeroUI CLI <version>

Current installed packages:

╭──────────────────────────────────────────────────────────────────────────────────────╮
│   Package          │   Version          │   Status   │   Docs                        │
│──────────────────────────────────────────────────────────────────────────────────────│
│   @heroui/react    │   3.0.0 🚀latest   │   stable   │   https://heroui.com          │
│   @heroui/styles   │   3.0.0 🚀latest   │   stable   │   https://heroui.com          │
╰──────────────────────────────────────────────────────────────────────────────────────╯
```

### Doctor

Check for issues in your project.

```bash
heroui doctor [options]
```

#### Features

> 1. Check whether `@heroui/react` and `@heroui/styles` are installed
> 2. Check whether `required peer dependencies` are installed and matched minimal requirements in the project

#### Doctor Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui doctor
```

Output:

If there is a problem in your project, the `doctor` command will display the problem information.

```bash
HeroUI CLI <version>

HeroUI CLI: ❌ Your project has 1 issue that require attention

❗️Issue 1: missingHeroUIPackages

The following HeroUI packages are not installed:
- @heroui/styles

Run `heroui install` to install them.
```

Otherwise, the `doctor` command will display the following message.

```bash
HeroUI CLI <version>

✅ Your project has no detected issues.
```

### Env

Display debug information about the local environment.

```bash
heroui env [options]
```

#### Env Options

- `-p --packagePath` [string] The path to the package.json file

##### Example

```bash
heroui env
```

Output:

```bash
HeroUI CLI <version>

Current installed packages:

╭──────────────────────────────────────────────────────────────────────────────────────╮
│   Package          │   Version          │   Status   │   Docs                        │
│──────────────────────────────────────────────────────────────────────────────────────│
│   @heroui/react    │   3.0.0 🚀latest   │   stable   │   https://heroui.com          │
│   @heroui/styles   │   3.0.0 🚀latest   │   stable   │   https://heroui.com          │
╰──────────────────────────────────────────────────────────────────────────────────────╯

Environment Info:
  System:
    OS: darwin
    CPU: arm64
  Binaries:
    Node: v25.8.1
```

### Agents-md

Download HeroUI documentation for AI coding agents (Claude, Cursor, etc.). This command downloads the latest documentation from the HeroUI repository and generates an index file that can be injected into markdown files like `AGENTS.md` or `CLAUDE.md` to help AI assistants understand your project's HeroUI setup.

```bash
heroui agents-md [options]
```

#### Features

> 1. Downloads latest HeroUI documentation from the `v3` branch
> 2. Supports React, Native, and Migration (v2→v3) documentation
> 3. Generates a section for the selected library (React, Native, or Migration) in the markdown file
> 4. Automatically adds `.heroui-docs/` to `.gitignore`

#### Agents-md Options

- `--react` [boolean] Include React docs only (one library at a time)
- `--native` [boolean] Include Native docs only
- `--migration` [boolean] Include HeroUI v2 to v3 migration docs only
- `--output <file>` [string] Target file path (e.g., `AGENTS.md`, `CLAUDE.md`)
- `--ssh` [boolean] Use SSH instead of HTTPS for git clone

#### Example

Run the command without any flags to enter interactive mode:

```bash
heroui agents-md
```

Download React docs to a specific file:

```bash
heroui agents-md --react --output AGENTS.md
```

Download Native docs:

```bash
heroui agents-md --native --output CLAUDE.md
```

Download migration docs (v2→v3):

```bash
heroui agents-md --migration --output AGENTS.md
```

Use SSH for cloning (useful if HTTPS fails):

```bash
heroui agents-md --react --ssh --output AGENTS.md
```

#### How It Works

1. **Downloads Documentation**: Clones the HeroUI repository using git sparse-checkout to download only the documentation files
2. **Generates Index**: Creates a compact index of all documentation files organized by directory
3. **Injects into Markdown**: Injects the index into your specified markdown file (e.g., `AGENTS.md`) with special markers:
   - `<!-- HEROUI-REACT-AGENTS-MD-START -->` / `<!-- HEROUI-REACT-AGENTS-MD-END -->` for React docs
   - `<!-- HEROUI-NATIVE-AGENTS-MD-START -->` / `<!-- HEROUI-NATIVE-AGENTS-MD-END -->` for Native docs
   - `<!-- HEROUI-MIGRATION-AGENTS-MD-START -->` / `<!-- HEROUI-MIGRATION-AGENTS-MD-END -->` for Migration docs
4. **Single library**: Only one of React, Native, or Migration can be selected at a time

#### File Structure

After running the command, you'll have:

```
your-project/
├── .heroui-docs/          # Downloaded documentation (gitignored)
│   ├── react/            # React documentation files (if selected)
│   ├── native/           # Native documentation files (if selected)
│   └── migration/        # Migration docs (v2→v3, if selected)
├── AGENTS.md             # Your markdown file with injected index
└── .gitignore            # Updated to include .heroui-docs/
```

#### Notes

- The command always downloads the latest documentation from the `v3` branch
- Documentation is stored in `.heroui-docs/` which is automatically added to `.gitignore`

### Community

We're excited to see the community adopt HeroUI CLI, raise issues, and provide feedback.
Whether it's a feature request, bug report, or a project to showcase, please get involved!

- [Discord](https://discord.gg/9b6yyZKmH4)
- [Twitter](https://twitter.com/hero_ui)
- [GitHub Discussions](https://github.com/heroui-inc/heroui-cli/discussions)

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](https://github.com/heroui-inc/heroui-cli/blob/main/CONTRIBUTING.md) for ways to get started.

Please adhere to this project's [CODE_OF_CONDUCT](https://github.com/heroui-inc/heroui-cli/blob/main/CODE_OF_CONDUCT.md).

## License

[MIT](https://choosealicense.com/licenses/mit/)
