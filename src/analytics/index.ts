import {Analytics} from './analytics';

let instance: Analytics | null = null;

const POSTHOG_KEY = '__HEROUI_CLI_POSTHOG_KEY__';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export function getAnalytics(): Analytics | null {
  if (instance !== null) {
    return instance;
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
