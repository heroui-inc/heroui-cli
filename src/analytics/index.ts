import {Analytics} from './analytics';

let instance: Analytics | null = null;

declare const __HEROUI_CLI_POSTHOG_KEY__: string;
// tsup substitutes this at build time. Running from source leaves it undeclared,
// where a bare reference is a ReferenceError rather than undefined.
const POSTHOG_KEY =
  typeof __HEROUI_CLI_POSTHOG_KEY__ === 'undefined' ? '' : __HEROUI_CLI_POSTHOG_KEY__;
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
