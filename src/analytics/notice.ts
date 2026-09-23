import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';

import {Logger} from '@helpers/logger';

const NOTICE_FILENAME = 'analytics-notice-seen';

function getConfigDir(): string {
  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];

  if (xdgConfigHome) {
    return xdgConfigHome;
  }

  if (process.platform === 'win32') {
    return process.env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local');
  }

  return join(homedir(), '.config');
}

function getNoticePath(): string {
  return join(getConfigDir(), 'heroui', NOTICE_FILENAME);
}

export function hasSeenNotice(): boolean {
  try {
    return existsSync(getNoticePath());
  } catch {
    return false;
  }
}

export function markNoticeSeen(): void {
  const path = getNoticePath();

  // A read-only or missing home directory must not take down the command
  try {
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, '', 'utf8');
  } catch {
    // Best-effort, the notice is simply shown again next time
  }
}

const NOTICE_TEXT =
  'Anonymous usage data is collected for agents-md. Opt out: HEROUI_ANALYTICS_DISABLED=1. Learn more: https://github.com/heroui-inc/heroui-cli#analytics\n';

export function showAnalyticsNotice(): void {
  if (hasSeenNotice()) {
    return;
  }

  Logger.log(NOTICE_TEXT);
  markNoticeSeen();
}
