/**
 * App settings come from src/app.config.json so they can be changed without
 * touching any code. This file checks the JSON and gives each setting a type.
 */
import rawConfig from './app.config.json';

export const THEMES = {
  indigo: {
    accent: '#4F46E5',
    accentStrong: '#4338CA',
    accentSoft: '#EEF2FF',
    accentSoftDark: '#1E1B4B',
  },
  teal: {
    accent: '#0F766E',
    accentStrong: '#115E59',
    accentSoft: '#E6F6F4',
    accentSoftDark: '#0B2F2C',
  },
  rose: {
    accent: '#BE123C',
    accentStrong: '#9F1239',
    accentSoft: '#FFF0F3',
    accentSoftDark: '#3B0A18',
  },
  amber: {
    accent: '#B45309',
    accentStrong: '#92400E',
    accentSoft: '#FFF6E5',
    accentSoftDark: '#3A2206',
  },
} as const;

export type ThemeName = keyof typeof THEMES;

export interface AppConfig {
  /** Shown in the header and the browser tab. */
  appName: string;
  /** Optional. Shown under the app name when not empty. */
  institutionName: string;
  /** Optional. Shown in the footer as "Built by ..." when not empty. */
  authorName: string;
  /** Accent colour; one of the keys of THEMES. */
  theme: ThemeName;
  /** Students below this percentage are flagged as "below threshold". */
  attendanceThreshold: number;
  /** Load a sample class on first run when no data has been saved yet. */
  seedDemoData: boolean;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(`src/app.config.json: ${message}`);
    this.name = 'ConfigError';
  }
}

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value);
}

export function parseConfig(value: unknown): AppConfig {
  if (typeof value !== 'object' || value === null)
    throw new ConfigError('the file must contain a JSON object');
  const input = value as Record<string, unknown>;

  const text = (key: string, required: boolean): string => {
    const field = input[key];
    if (typeof field !== 'string') throw new ConfigError(`"${key}" must be a string`);
    if (required && field.trim().length === 0) throw new ConfigError(`"${key}" must not be empty`);
    return field.trim();
  };

  if (!isThemeName(input.theme)) {
    throw new ConfigError(`"theme" must be one of: ${Object.keys(THEMES).join(', ')}`);
  }
  const threshold = input.attendanceThreshold;
  if (
    typeof threshold !== 'number' ||
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > 100
  ) {
    throw new ConfigError('"attendanceThreshold" must be a whole number from 1 to 100');
  }
  if (typeof input.seedDemoData !== 'boolean')
    throw new ConfigError('"seedDemoData" must be true or false');

  return {
    appName: text('appName', true),
    institutionName: text('institutionName', false),
    authorName: text('authorName', false),
    theme: input.theme,
    attendanceThreshold: threshold,
    seedDemoData: input.seedDemoData,
  };
}

/** Writes the theme colours into CSS custom properties used by styles.css. */
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
