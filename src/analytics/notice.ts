import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname} from 'node:path';

import {Logger} from '@helpers/logger';

const NOTICE_FILENAME = 'analytics-notice-seen';

function getNoticePath(): string {
  return `${homedir()}/.config/heroui/${NOTICE_FILENAME}`;
}

export function hasSeenNotice(): boolean {
  return existsSync(getNoticePath());
}

export function markNoticeSeen(): void {
  const path = getNoticePath();

  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, '', 'utf8');
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
