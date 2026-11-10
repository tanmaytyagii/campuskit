/**
 * The language of CampusKit's menus: English (the default) or Hindi, chosen in Settings and saved
 * in this browser under campuskit:locale:v1. The page's lang attribute follows the choice, so
 * screen readers pronounce the text correctly. Only the site chrome, the palette, the shortcut
 * list, the dashboard and the language setting are translated; other pages stay in English.
 */
import { useSyncExternalStore } from 'react';

import { en, type MessageKey, type Messages } from '../i18n/en.ts';
import { hi } from '../i18n/hi.ts';
import { readStored, writeStored } from './storage.ts';

export const LOCALE_KEY = 'campuskit:locale:v1';
export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
/** Each language's name in that language, as language pickers show them. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', hi: 'हिन्दी' };

const CATALOGS: Record<Locale, Messages> = { en, hi };

function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

let current: Locale | null = null;
const listeners = new Set<() => void>();

export const localeStore = {
  getSnapshot: (): Locale => {
    current ??= readStored(LOCALE_KEY, isLocale) ?? 'en';
    return current;
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Saves the choice; returns false when the browser refused to store it (it still applies). */
  set: (locale: Locale): boolean => {
    current = locale;
    const saved = writeStored(LOCALE_KEY, locale);
    applyLocale();
    for (const listener of listeners) listener();
    return saved;
  },
  reload: (): void => {
    current = null;
    applyLocale();
    for (const listener of listeners) listener();
  },
};

/** Sets the page's lang attribute to the chosen language. */
export function applyLocale(): void {
  document.documentElement.lang = localeStore.getSnapshot();
}

export function translate(
  locale: Locale,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  return CATALOGS[locale][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export function useLocale(): Locale {
  return useSyncExternalStore(localeStore.subscribe, localeStore.getSnapshot, () => 'en' as const);
}

/** The translate function for the chosen language. */
export function useT(): Translate {
  const locale = useLocale();
  return (key, values) => translate(locale, key, values);
}
