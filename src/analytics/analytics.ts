import {PostHog} from 'posthog-node';

import {getErrorMessage} from './utils';

export type AgentsMdEvent = 'AGENTS_MD_SUCCESS' | 'AGENTS_MD_ERROR';

export interface AgentsMdProperties {
  selection?: 'react' | 'native' | 'both';
  outputFiles?: string[];
  outputFileCount?: number;
  duration?: number;
  [key: string]: unknown;
}

const APP_NAME = 'cli';
const DISTINCT_ID = 'cli-anonymous';

export class Analytics {
  private posthog: PostHog | null = null;

  constructor({dryRun, host, key}: {host: string; key: string; dryRun?: boolean}) {
    if (dryRun) {
      return;
    }

    if (key && host) {
      this.posthog = new PostHog(key, {host});
    }
  }

  track({event, properties = {}}: {event: AgentsMdEvent; properties?: AgentsMdProperties}) {
    this.posthog?.capture({
      distinctId: DISTINCT_ID,
      event,
      properties: {app: APP_NAME, ...properties}
    });
  }

  trackError({
    error,
    errorEvent,
    fallbackMessage,
    properties = {}
  }: {
    error: unknown;
    errorEvent: 'AGENTS_MD_ERROR';
    fallbackMessage?: string;
    properties?: AgentsMdProperties;
  }) {
    this.posthog?.capture({
      distinctId: DISTINCT_ID,
      event: errorEvent,
      properties: {
        app: APP_NAME,
        errorMessage: getErrorMessage(error, fallbackMessage),
        isError: true,
        ...properties
      }
    });
  }

  async shutdown() {
    await this.posthog?.shutdown();
  }
}
