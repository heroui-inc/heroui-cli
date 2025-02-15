# HeroUI CLI Contributing Guide

Hello!, I am very excited that you are interested in contributing with HeroUI CLI. However, before submitting your contribution, be sure to take a moment and read the following guidelines.

- [Code of Conduct](https://github.com/heroui-inc/heroui-cli/blob/main/CODE_OF_CONDUCT.md)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)
- [Documentation](#documentation)
- [Breaking Changes](#breaking-changes)
- [Becoming a maintainer](#becoming-a-maintainer)

### Tooling

- [PNPM](https://pnpm.io/) to manage packages and dependencies
- [Tsup](https://tsup.egoist.sh/) to bundle packages

### Commit Convention

Before you create a Pull Request, please check whether your commits comply with
the commit conventions used in this repository.

When you create a commit we kindly ask you to follow the convention
`category(scope or module): message` in your commit message while using one of
the following categories:

- `feat / feature`: all changes that introduce completely new code or new
  features
- `fix`: changes that fix a bug (ideally you will additionally reference an
  issue if present)
- `refactor`: any code related change that is not a fix nor a feature
- `docs`: changing existing or creating new documentation (i.e. README, docs for
  usage of a lib or cli usage)
- `build`: all changes regarding the build of the software, changes to
  dependencies or the addition of new dependencies
- `test`: all changes regarding tests (adding new tests or changing existing
  ones)
- `ci`: all changes regarding the configuration of continuous integration (i.e.
  github actions, ci system)
- `chore`: all changes to the repository that do not fit into any of the above
  categories

  e.g. `feat(components): add new prop to the avatar component`

If you are interested in the detailed specification you can visit
https://www.conventionalcommits.org/ or check out the
[Angular Commit Message Guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

## Pull Request Guidelines

- The `main` branch is basically a snapshot of the latest stable version. All development must be done in dedicated branches.
- Make sure that Github Actions are green
- It is good to have multiple small commits while working on the PR. We'll let GitHub squash it automatically before the merge.
- If you add a new feature:
  - Add the test case that accompanies it.
  - Provide a compelling reason to add this feature. Ideally, I would first open a suggestion topic and green it before working on it.
- If you correct an error:
  - If you are solving a special problem, add (fix #xxxx [, # xxx]) (# xxxx is the problem identification) in your PR title for a better launch record, for example update entities encoding / decoding (fix # 3899).
  - Provide a detailed description of the error in the PR. Favorite live demo.
  - Add the appropriate test coverage, if applicable.

### Steps to PR

1. Fork of the heroui cli repository and clone your fork

2. Create a new branch out of the `main` branch. We follow the convention
   `[type/scope]`. For example `fix/dropdown-hook` or `docs/menu-typo`. `type`
   can be either `docs`, `fix`, `feat`, `build`, or any other conventional
   commit type. `scope` is just a short id that describes the scope of work.

3. Make and commit your changes following the
   [commit convention](https://github.com/heroui-inc/heroui-cli/blob/main/CONTRIBUTING.md#commit-convention).
   As you develop, you can run `pnpm lint` and
   `pnpm build` e.g. `pnpm lint && pnpm build` to make sure everything works as expected.

4. Please note that you might have to run `git fetch origin main:master` (where
   origin will be your fork on GitHub).

## Development Setup

After cloning the repository, execute the following commands in the root folder:

1. Install dependencies

   ```bash
   pnpm i

   #or

   pnpm install
   ```

2. Run dev to start development

   ```bash
   ## Start the dev babel server of HeroUI CLI
   pnpm dev
   ```

   Remember that these commands must be executed in the root folder of the project.

3. Create a branch for your feature or fix:

   ```bash
   ## Move into a new branch for your feature
   git checkout -b feat/thing
   ```

   ```bash
   ## Move into a new branch for your fix
   git checkout -b fix/something
   ```

4. Test locally

   ```bash
   ## make sure pnpm dev is running
   npm link
   ## then run heroui-cli locally and test
   ```

   > Note: ensure your version of Node is 18.17.x or higher to run scripts

5. Build the CLI

   ```bash
   pnpm lint && pnpm build
   ```

6. Send your pull request:

   - Send your pull request to the `main` branch
   - Your pull request will be reviewed by the maintainers and the maintainers will decide if it is accepted or not
   - Once the pull request is accepted, the maintainers will merge it to the `main` branch

## Documentation

Please update the docs with any command changes, the code and docs should always be in sync.

The main documentation lives in `https://heroui.com/docs/guide/cli`, please create a PR in `heroui-inc/heroui` instead.

## Breaking changes

Breaking changes should be accompanied with deprecations of removed functionality. The deprecated changes themselves should not be removed until the minor release after that.

## Becoming a maintainer

If you are interested in becoming a HeroUI maintainer, start by
reviewing issues and pull requests. Answer questions for those in need of
troubleshooting. Join us in the
[Discord Community](https://discord.gg/9b6yyZKmH4) chat room.
Once we see you helping, either we will reach out and ask you if you want to
join or you can ask one of the current maintainers to add you. We will try our
best to be proactive in reaching out to those that are already helping out.

GitHub by default does not publicly state that you are a member of the
organization. Please feel free to change that setting for yourself so others
will know who's helping out. That can be configured on the [organization
list](https://github.com/orgs/heroui-inc/people) page.

Being a maintainer is not an obligation. You can help when you have time and be
less active when you don't. If you get a new job and get busy, that's alright.
