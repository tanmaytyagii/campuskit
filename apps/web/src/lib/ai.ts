/**
 * The optional AI assistant's connection to a provider. Nothing here runs unless the student adds
 * their own API key and confirms each request after reading exactly what will be sent.
 *
 * - The key is the student's own. It is kept in memory, or in sessionStorage (cleared when the tab
 *   closes) only if they ask; never in localStorage, never in a backup, never in the code.
 * - Each tab has a request limit the student can change, counted in sessionStorage.
 * - Requests go from the browser straight to the provider; CampusKit has no server.
 *
 * The provider is an interface so another one could be added; today there is one: Anthropic's
 * Claude, through the official SDK, loaded only when a request is made.
 */
import { useSyncExternalStore } from 'react';

import { readStored, readSession, writeSession, writeStored } from './storage.ts';

export const AI_KEY_SESSION = 'campuskit:ai-key:v1';
export const AI_USAGE_SESSION = 'campuskit:ai-usage:v1';
export const AI_SETTINGS_KEY = 'campuskit:ai-settings:v1';
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface AiRequest {
  system: string;
  user: string;
}

export type AiResult =
  | { kind: 'done'; text: string }
  /** The answer hit the length limit and stops part-way. */
  | { kind: 'cut-off'; text: string }
  | { kind: 'refused'; text: string };

export type AiFailure =
  'key' | 'permission' | 'rate-limit' | 'too-long' | 'connection' | 'stopped' | 'server';

export class AiError extends Error {
  constructor(
    readonly reason: AiFailure,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface StreamOptions {
  apiKey: string;
  /** Called with the whole answer so far each time more arrives. */
  onText: (text: string) => void;
  signal: AbortSignal;
}

export interface AiProvider {
  id: string;
  name: string;
  model: string;
  /** Where requests go, shown to the student before they agree to send one. */
  endpoint: string;
  keyHint: string;
  keyPattern: RegExp;
  stream: (request: AiRequest, options: StreamOptions) => Promise<AiResult>;
}

export const anthropicProvider: AiProvider = {
  id: 'anthropic',
  name: 'Anthropic (Claude)',
  model: 'claude-opus-5-5',
  endpoint: 'https://api.anthropic.com',
  keyHint: 'Starts with sk-ant-. Create one in the Claude Console under API keys.',
  keyPattern: /^sk-ant-[\w-]{20,}$/,
  stream: async (request, { apiKey, onText, signal }) => {
    const sdk = await import('@anthropic-ai/sdk');
    // The key is the student's own and stays in their browser, so a browser client is intended.
    const client = new sdk.default({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
    try {
      const stream = client.beta.messages.stream(
        {
          model: anthropicProvider.model,
          max_tokens: 16_000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          // If the model declines, the API may retry once on a fallback model before answering.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
        },
        { signal },
      );
      stream.on('text', (_delta, snapshot) => onText(snapshot));
      const message = await stream.finalMessage();
      const text = message.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
      if (message.stop_reason === 'refusal') return { kind: 'refused', text };
      if (message.stop_reason === 'max_tokens') return { kind: 'cut-off', text };
      return { kind: 'done', text };
    } catch (error) {
      if (error instanceof sdk.APIUserAbortError || signal.aborted)
        throw new AiError('stopped', 'Stopped. Nothing more will arrive for this request.');
      if (error instanceof sdk.AuthenticationError)
        throw new AiError('key', 'The API key wasn’t accepted. Check it, or create a new one.');
      if (error instanceof sdk.PermissionDeniedError)
        throw new AiError('permission', 'This API key isn’t allowed to use this model.');
      if (error instanceof sdk.RateLimitError)
        throw new AiError(
          'rate-limit',
          'The provider says too many requests were made. Wait a minute and try again.',
        );
      if (error instanceof sdk.BadRequestError)
        throw new AiError(
          'too-long',
          'The provider couldn’t accept this request. Try shorter text, or check your account.',
        );
      if (error instanceof sdk.APIConnectionError)
        throw new AiError(
          'connection',
          'Couldn’t reach the provider. Check your connection and try again.',
        );
      throw new AiError(
        'server',
        'The provider had a problem with this request. Try again in a little while.',
      );
    }
  },
};

export const PROVIDERS: readonly AiProvider[] = [anthropicProvider];

// The key: in memory, and in sessionStorage only when the student asks to keep it for the tab.

interface KeyState {
  key: string;
  keepForTab: boolean;
}

const NO_KEY: KeyState = { key: '', keepForTab: false };
let keyState: KeyState | null = null;
const keyListeners = new Set<() => void>();

function readKeyState(): KeyState {
  const stored = readSession(AI_KEY_SESSION);
  return typeof stored === 'string' && stored ? { key: stored, keepForTab: true } : NO_KEY;
}

export const aiKeyStore = {
  getSnapshot: (): KeyState => {
    keyState ??= readKeyState();
    return keyState;
  },
  subscribe: (listener: () => void): (() => void) => {
    keyListeners.add(listener);
    return () => keyListeners.delete(listener);
  },
  set: (key: string, keepForTab: boolean): void => {
    keyState = { key: key.trim(), keepForTab };
    if (keepForTab && keyState.key) writeSession(AI_KEY_SESSION, keyState.key);
    else removeSession(AI_KEY_SESSION);
    for (const listener of keyListeners) listener();
  },
  forget: (): void => {
    keyState = NO_KEY;
    removeSession(AI_KEY_SESSION);
    for (const listener of keyListeners) listener();
  },
  /** For tests: drops the in-memory key. */
  reset: (): void => {
    keyState = null;
  },
};

function removeSession(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

export function useAiKey(): KeyState {
  return useSyncExternalStore(aiKeyStore.subscribe, aiKeyStore.getSnapshot, () => NO_KEY);
}

// The request limit: a setting kept in this browser, and a count kept for this tab.

interface AiSettings {
  version: 1;
  limit: number;
}

function isSettings(value: unknown): value is AiSettings {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AiSettings>;
  return (
    candidate.version === 1 &&
    Number.isInteger(candidate.limit) &&
    (candidate.limit ?? 0) >= 1 &&
    (candidate.limit ?? 0) <= MAX_LIMIT
  );
}

export function readLimit(): number {
  return readStored(AI_SETTINGS_KEY, isSettings)?.limit ?? DEFAULT_LIMIT;
}

export function saveLimit(limit: number): boolean {
  const clamped = Math.min(MAX_LIMIT, Math.max(1, Math.round(limit)));
  return writeStored(AI_SETTINGS_KEY, { version: 1, limit: clamped } satisfies AiSettings);
}

export function readUsage(): number {
  const used = readSession(AI_USAGE_SESSION);
  return typeof used === 'number' && Number.isInteger(used) && used >= 0 ? used : 0;
}

/** Counts a request against this tab's limit; returns false, counting nothing, when it's used up. */
export function recordUse(limit: number = readLimit()): boolean {
  const used = readUsage();
  if (used >= limit) return false;
  writeSession(AI_USAGE_SESSION, used + 1);
  return true;
}
