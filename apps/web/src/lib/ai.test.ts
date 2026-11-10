import { describe, expect, it } from 'vitest';

import {
  AI_KEY_SESSION,
  AI_SETTINGS_KEY,
  aiKeyStore,
  anthropicProvider,
  DEFAULT_LIMIT,
  readLimit,
  readUsage,
  recordUse,
  saveLimit,
} from './ai.ts';

const KEY = 'sk-ant-test-not-a-real-key-0001';

describe('AI key', () => {
  it('stays in memory unless the student keeps it for the tab, and never reaches localStorage', () => {
    aiKeyStore.set(KEY, false);
    expect(aiKeyStore.getSnapshot()).toEqual({ key: KEY, keepForTab: false });
    expect(window.sessionStorage.getItem(AI_KEY_SESSION)).toBeNull();

    aiKeyStore.set(KEY, true);
    expect(window.sessionStorage.getItem(AI_KEY_SESSION)).toBe(JSON.stringify(KEY));
    aiKeyStore.reset();
    expect(aiKeyStore.getSnapshot()).toEqual({ key: KEY, keepForTab: true });

    aiKeyStore.forget();
    expect(aiKeyStore.getSnapshot().key).toBe('');
    expect(window.sessionStorage.getItem(AI_KEY_SESSION)).toBeNull();
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('sk-ant');
  });

  it('checks the key looks like an Anthropic key', () => {
    expect(anthropicProvider.keyPattern.test(KEY)).toBe(true);
    expect(anthropicProvider.keyPattern.test('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(false);
    expect(anthropicProvider.keyPattern.test('sk-ant-short')).toBe(false);
  });
});

describe('request limit', () => {
  it('counts requests for this tab and refuses once the limit is reached', () => {
    expect(readLimit()).toBe(DEFAULT_LIMIT);
    expect(recordUse(2)).toBe(true);
    expect(recordUse(2)).toBe(true);
    expect(recordUse(2)).toBe(false);
    expect(readUsage()).toBe(2);
  });

  it('keeps the limit between 1 and 100 and ignores a hand-edited setting', () => {
    saveLimit(500);
    expect(readLimit()).toBe(100);
    saveLimit(0);
    expect(readLimit()).toBe(1);
    window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ version: 1, limit: 'lots' }));
    expect(readLimit()).toBe(DEFAULT_LIMIT);
  });
});
