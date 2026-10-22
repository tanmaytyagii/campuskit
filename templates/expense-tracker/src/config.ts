/**
 * App settings come from src/app.config.json so they can be changed without
 * touching any code. This file checks the JSON and gives each setting a type.
 */
import rawConfig from './app.config.json';

export const THEMES = {
  emerald: {
    accent: '#047857',
    accentStrong: '#065F46',
    accentSoft: '#E7F5EF',
    accentSoftDark: '#0B2A20',
  },
  ocean: {
    accent: '#0369A1',
    accentStrong: '#075985',
    accentSoft: '#E6F2FA',
    accentSoftDark: '#0A2333',
  },
  plum: {
    accent: '#7E22CE',
    accentStrong: '#6B21A8',
    accentSoft: '#F4ECFC',
    accentSoftDark: '#2A1240',
  },
  coral: {
    accent: '#C2410C',
    accentStrong: '#9A3412',
    accentSoft: '#FDEFE8',
    accentSoftDark: '#38160A',
  },
} as const;

export type ThemeName = keyof typeof THEMES;

/** Supported currencies and the locale used to format them. */
export const CURRENCIES = {
  INR: { locale: 'en-IN', label: 'Indian rupee (₹)' },
  USD: { locale: 'en-US', label: 'US dollar ($)' },
  EUR: { locale: 'en-IE', label: 'Euro (€)' },
  GBP: { locale: 'en-GB', label: 'Pound sterling (£)' },
  JPY: { locale: 'ja-JP', label: 'Japanese yen (¥)' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface AppConfig {
  appName: string;
  /** Optional. Shown in the footer as "Built by ..." when not empty. */
  authorName: string;
  currency: CurrencyCode;
  /** Default monthly spending budget in whole currency units (0 = no budget). */
  monthlyBudget: number;
  theme: ThemeName;
  /** Load sample transactions on first run when nothing has been saved yet. */
  seedDemoData: boolean;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(`src/app.config.json: ${message}`);
    this.name = 'ConfigError';
  }
}

function isKeyOf<T extends object>(object: T, value: unknown): value is keyof T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(object, value);
}

export function parseConfig(value: unknown): AppConfig {
  if (typeof value !== 'object' || value === null)
    throw new ConfigError('the file must contain a JSON object');
  const input = value as Record<string, unknown>;

  if (typeof input.appName !== 'string' || input.appName.trim() === '') {
    throw new ConfigError('"appName" must be a non-empty string');
  }
  if (typeof input.authorName !== 'string') throw new ConfigError('"authorName" must be a string');
  if (!isKeyOf(CURRENCIES, input.currency)) {
    throw new ConfigError(`"currency" must be one of: ${Object.keys(CURRENCIES).join(', ')}`);
  }
  const budget = input.monthlyBudget;
  if (
    typeof budget !== 'number' ||
    !Number.isInteger(budget) ||
    budget < 0 ||
    budget > 100_000_000
  ) {
    throw new ConfigError('"monthlyBudget" must be a whole number from 0 to 100000000');
  }
  if (!isKeyOf(THEMES, input.theme))
    throw new ConfigError(`"theme" must be one of: ${Object.keys(THEMES).join(', ')}`);
  if (typeof input.seedDemoData !== 'boolean')
    throw new ConfigError('"seedDemoData" must be true or false');

  return {
    appName: input.appName.trim(),
    authorName: input.authorName.trim(),
    currency: input.currency,
    monthlyBudget: budget,
    theme: input.theme,
    seedDemoData: input.seedDemoData,
  };
}

export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  const colours = THEMES[theme];
  root.style.setProperty('--accent', colours.accent);
  root.style.setProperty('--accent-strong', colours.accentStrong);
  root.style.setProperty('--accent-soft-light', colours.accentSoft);
  root.style.setProperty('--accent-soft-dark', colours.accentSoftDark);
}

export function loadConfig(): AppConfig {
  return parseConfig(rawConfig);
}
