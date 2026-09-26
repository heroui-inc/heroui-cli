import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {PostHog} from 'posthog-node';
import {getAnalytics, shutdown} from 'src/analytics';
import {Analytics} from 'src/analytics/analytics';
import {hasSeenNotice, markNoticeSeen, showAnalyticsNotice} from 'src/analytics/notice';
import {getErrorMessage} from 'src/analytics/utils';
import {afterEach, describe, expect, it, vi} from 'vitest';

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  shutdown: vi.fn(async () => undefined)
}));

vi.mock('posthog-node', () => ({
  PostHog: vi.fn(function PostHog(this: {
    capture: typeof posthog.capture;
    shutdown: typeof posthog.shutdown;
  }) {
    this.capture = posthog.capture;
    this.shutdown = posthog.shutdown;
  })
}));

describe('analytics', () => {
  let workspace = '';

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
      workspace = '';
    }
  });

  it('formats error messages', () => {
    expect(getErrorMessage(undefined)).toBe('Unknown error');
    expect(getErrorMessage('', 'fallback')).toBe('fallback');
    expect(getErrorMessage('plain')).toBe('plain');
    expect(getErrorMessage({messages: ['a', 'b']})).toBe('a, b');
    expect(getErrorMessage({errorMessage: 'detail'})).toBe('detail');
    expect(getErrorMessage({code: 1})).toBe('{"code":1}');
    expect(getErrorMessage(1)).toBe('1');
  });

  it('does not send events in dry-run mode or without a key', async () => {
    const dryRun = new Analytics({dryRun: true, host: 'https://example.com', key: 'phc_test'});

    dryRun.track({event: 'AGENTS_MD_SUCCESS', properties: {selection: 'react'}});
    dryRun.trackError({
      error: new Error('nope'),
      errorEvent: 'AGENTS_MD_ERROR',
      fallbackMessage: 'failed'
    });
    await dryRun.shutdown();

    const withoutKey = new Analytics({host: 'https://example.com', key: ''});

    withoutKey.track({event: 'AGENTS_MD_SUCCESS'});
    await withoutKey.shutdown();
    expect(PostHog).not.toHaveBeenCalled();
  });

  it('captures events when posthog is configured', async () => {
    const analytics = new Analytics({host: 'https://example.com', key: 'phc_test'});

    analytics.track({event: 'AGENTS_MD_SUCCESS', properties: {outputFileCount: 1}});
    analytics.trackError({error: {err: 'bad'}, errorEvent: 'AGENTS_MD_ERROR'});
    await analytics.shutdown();

    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.shutdown).toHaveBeenCalled();
  });

  it('returns null when analytics is disabled or no key was compiled in', async () => {
    expect(getAnalytics()).toBeNull();
    await shutdown();

    vi.stubEnv('HEROUI_ANALYTICS_DISABLED', 'true');
    vi.stubGlobal('__HEROUI_CLI_POSTHOG_KEY__', 'phc_test');
    vi.resetModules();

    const disabled = await import('src/analytics');

    expect(disabled.getAnalytics()).toBeNull();
    await disabled.shutdown();
  });

  it('records that the notice was shown under XDG_CONFIG_HOME', () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-notice-'));
    vi.stubEnv('XDG_CONFIG_HOME', workspace);
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    expect(hasSeenNotice()).toBe(false);
    showAnalyticsNotice();
    expect(hasSeenNotice()).toBe(true);
    showAnalyticsNotice();
    expect(log).toHaveBeenCalledTimes(1);
    markNoticeSeen();
    expect(hasSeenNotice()).toBe(true);
  });
});
