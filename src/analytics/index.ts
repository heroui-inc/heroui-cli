import {Analytics} from './analytics';

let instance: Analytics | null = null;

declare const __HEROUI_CLI_POSTHOG_KEY__: string;
const POSTHOG_KEY = __HEROUI_CLI_POSTHOG_KEY__;
const POSTHOG_HOST = 'https://us.i.posthog.com';

function isAnalyticsDisabled(): boolean {
  const disabled = process.env['HEROUI_ANALYTICS_DISABLED'];

  return disabled === '1' || disabled === 'true';
}

export function getAnalytics(): Analytics | null {
  if (instance !== null) {
    return instance;
  }

  if (isAnalyticsDisabled()) {
    return null;
  }

  if (!POSTHOG_KEY) {
    return null;
  }

  instance = new Analytics({
    dryRun: false,
    host: POSTHOG_HOST,
    key: POSTHOG_KEY
  });

  return instance;
}

export async function shutdown(): Promise<void> {
  if (instance) {
    await instance.shutdown();
    instance = null;
  }
}

export {Analytics} from './analytics';
export type {AgentsMdEvent, AgentsMdProperties} from './analytics';
