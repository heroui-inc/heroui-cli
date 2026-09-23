import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const LOCKFILE_SETTING = 'package-lock=true';

/**
 * Templates ship an `.npmrc` with `package-lock=false`, which stops npm from
 * generating a lockfile. Flip that setting on without discarding anything else
 * the template put in the file.
 *
 * `package-lock` is an npm-only setting, so this is a no-op for other managers.
 */
export function changeNpmrc(npmrcFile: string) {
  const existing = existsSync(npmrcFile) ? readFileSync(npmrcFile, 'utf-8') : '';

  if (/^\s*package-lock\s*=/m.test(existing)) {
    writeFileSync(
      npmrcFile,
      existing.replace(/^\s*package-lock\s*=.*$/m, LOCKFILE_SETTING),
      'utf-8'
    );

    return;
  }

  const separator = !existing || existing.endsWith('\n') ? '' : '\n';

  writeFileSync(npmrcFile, `${existing}${separator}${LOCKFILE_SETTING}\n`, 'utf-8');
}
