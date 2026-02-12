import fs from 'node:fs';
import path from 'node:path';

export interface HerouiVersionsResult {
  react?: string;
  native?: string;
  error?: string;
}

type WorkspaceType = 'pnpm' | 'npm' | 'yarn' | 'nx' | 'lerna' | null;

interface WorkspaceInfo {
  isMonorepo: boolean;
  type: WorkspaceType;
  packages: string[];
}

function detectWorkspace(cwd: string): WorkspaceInfo {
  const packageJsonPath = path.join(cwd, 'package.json');

  // Check pnpm workspaces (pnpm-workspace.yaml)
  const pnpmWorkspacePath = path.join(cwd, 'pnpm-workspace.yaml');

  if (fs.existsSync(pnpmWorkspacePath)) {
    const packages = parsePnpmWorkspace(pnpmWorkspacePath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'pnpm'};
    }
  }

  // Check npm/yarn workspaces (package.json workspaces field)
  if (fs.existsSync(packageJsonPath)) {
    const packages = parsePackageJsonWorkspaces(packageJsonPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'npm'};
    }
  }

  // Check Lerna (lerna.json)
  const lernaPath = path.join(cwd, 'lerna.json');

  if (fs.existsSync(lernaPath)) {
    const packages = parseLernaConfig(lernaPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'lerna'};
    }
  }

  // Check Nx (nx.json)
  const nxPath = path.join(cwd, 'nx.json');

  if (fs.existsSync(nxPath)) {
    const packages = parseNxWorkspace(cwd, packageJsonPath);

    if (packages.length > 0) {
      return {isMonorepo: true, packages, type: 'nx'};
    }
  }

  return {isMonorepo: false, packages: [], type: null};
}

function parsePnpmWorkspace(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const packages: string[] = [];
    let inPackages = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'packages:') {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
          break;
        }
        const match = trimmed.match(/^-\s*["']?([^"']+)["']?$/);

        if (match && match[1]) {
          packages.push(match[1]);
        }
      }
    }

    return packages;
  } catch {
    return [];
  }
}

function parsePackageJsonWorkspaces(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content);

    if (Array.isArray(pkg.workspaces)) {
      return pkg.workspaces;
    }
    if (pkg.workspaces?.packages && Array.isArray(pkg.workspaces.packages)) {
      return pkg.workspaces.packages;
    }

    return [];
  } catch {
    return [];
  }
}

function parseLernaConfig(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    if (Array.isArray(config.packages)) {
      return config.packages;
    }

    return ['packages/*'];
  } catch {
    return [];
  }
}

function parseNxWorkspace(cwd: string, packageJsonPath: string): string[] {
  if (fs.existsSync(packageJsonPath)) {
    const packages = parsePackageJsonWorkspaces(packageJsonPath);

    if (packages.length > 0) {
      return packages;
    }
  }
  const defaultPatterns = ['apps/*', 'libs/*', 'packages/*'];
  const existingPatterns: string[] = [];

  for (const pattern of defaultPatterns) {
    const basePath = path.join(cwd, pattern.replace('/*', ''));

    if (fs.existsSync(basePath)) {
      existingPatterns.push(pattern);
    }
  }

  return existingPatterns;
}

function findHerouiInWorkspace(cwd: string, patterns: string[]): {react?: string; native?: string} {
  const packagePaths = expandWorkspacePatterns(cwd, patterns);
  const reactVersions: string[] = [];
  const nativeVersions: string[] = [];

  for (const pkgPath of packagePaths) {
    const packageJsonPath = path.join(pkgPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) continue;

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const reactVersion =
        pkg.dependencies?.['@heroui/react'] || pkg.devDependencies?.['@heroui/react'];
      const nativeVersion =
        pkg.dependencies?.['heroui-native'] || pkg.devDependencies?.['heroui-native'];

      if (reactVersion) {
        reactVersions.push(reactVersion.replace(/^[<=>^~]+/, ''));
      }
      if (nativeVersion) {
        nativeVersions.push(nativeVersion.replace(/^[<=>^~]+/, ''));
      }
    } catch {
      // Skip invalid package.json
    }
  }

  const nativeVersion = findHighestVersion(nativeVersions);
  const reactVersion = findHighestVersion(reactVersions);

  return {
    ...(nativeVersion ? {native: nativeVersion} : {}),
    ...(reactVersion ? {react: reactVersion} : {})
  };
}

function expandWorkspacePatterns(cwd: string, patterns: string[]): string[] {
  const packagePaths: string[] = [];

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;

    if (pattern.includes('*')) {
      packagePaths.push(...expandGlobPattern(cwd, pattern));
    } else {
      const fullPath = path.join(cwd, pattern);

      if (fs.existsSync(fullPath)) {
        packagePaths.push(fullPath);
      }
    }
  }

  return [...new Set(packagePaths)];
}

function expandGlobPattern(cwd: string, pattern: string): string[] {
  const parts = pattern.split('/');
  const results: string[] = [];

  function walk(currentPath: string, partIndex: number): void {
    if (partIndex >= parts.length) {
      if (fs.existsSync(path.join(currentPath, 'package.json'))) {
        results.push(currentPath);
      }

      return;
    }

    const part = parts[partIndex];

    if (!part) return;

    if (part === '*') {
      if (!fs.existsSync(currentPath)) return;
      try {
        for (const entry of fs.readdirSync(currentPath)) {
          const fullPath = path.join(currentPath, entry);

          if (isDirectory(fullPath)) {
            if (partIndex === parts.length - 1) {
              if (fs.existsSync(path.join(fullPath, 'package.json'))) {
                results.push(fullPath);
              }
            } else {
              walk(fullPath, partIndex + 1);
            }
          }
        }
      } catch {
        // Permission denied
      }
    } else if (part === '**') {
      walkRecursive(currentPath, results);
    } else {
      walk(path.join(currentPath, part), partIndex + 1);
    }
  }

  walk(cwd, 0);

  return results;
}

function walkRecursive(dir: string, results: string[]): void {
  if (!fs.existsSync(dir)) return;

  if (fs.existsSync(path.join(dir, 'package.json'))) {
    results.push(dir);
  }

  try {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const fullPath = path.join(dir, entry);

      if (isDirectory(fullPath)) {
        walkRecursive(fullPath, results);
      }
    }
  } catch {
    // Permission denied
  }
}

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function findHighestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0] ?? null;

  return versions.reduce((highest, current) => {
    if (!highest) return current ?? null;
    if (!current) return highest;

    return compareVersions(current, highest) > 0 ? current : highest;
  });
}

function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): [number, number, number] => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (!match) return [0, 0, 0];

    return [
      parseInt(match[1] ?? '0', 10),
      parseInt(match[2] ?? '0', 10),
      parseInt(match[3] ?? '0', 10)
    ];
  };

  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;

  return aPatch - bPatch;
}

export function getHerouiVersions(cwd: string): HerouiVersionsResult {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return {
      error: 'No package.json found in the current directory'
    };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const reactVersion = dependencies['@heroui/react'] || devDependencies['@heroui/react'];
    const nativeVersion = dependencies['heroui-native'] || devDependencies['heroui-native'];

    const result: HerouiVersionsResult = {};

    if (reactVersion) {
      result.react = reactVersion.replace(/^[<=>^~]+/, '');
    }

    if (nativeVersion) {
      result.native = nativeVersion.replace(/^[<=>^~]+/, '');
    }

    // If neither found, check for monorepo workspace
    if (!reactVersion && !nativeVersion) {
      const workspace = detectWorkspace(cwd);

      if (workspace.isMonorepo && workspace.packages.length > 0) {
        const versions = findHerouiInWorkspace(cwd, workspace.packages);

        if (versions.react) {
          result.react = versions.react;
        }
        if (versions.native) {
          result.native = versions.native;
        }

        if (!versions.react && !versions.native) {
          return {
            error: `No HeroUI packages found in ${workspace.type} workspace packages.`
          };
        }
      } else {
        return {
          error:
            'HeroUI packages (@heroui/react or heroui-native) are not installed in this project.'
        };
      }
    }

    return result;
  } catch (err) {
    return {
      error: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
