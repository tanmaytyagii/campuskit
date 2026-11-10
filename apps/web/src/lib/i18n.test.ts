import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { en, type MessageKey } from '../i18n/en.ts';
import { hi } from '../i18n/hi.ts';
import { renderRoute } from '../test/render.tsx';
import { LOCALE_KEY, localeStore, translate } from './i18n.ts';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('message catalogs', () => {
  it('give every message in Hindi, with the same placeholders as the English one', () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(hi[key].trim(), key).not.toBe('');
      expect(placeholders(hi[key]), key).toEqual(placeholders(en[key]));
    }
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it('fill in values and leave unknown placeholders visible', () => {
    expect(translate('en', 'dashboard.welcome', { name: 'Asha' })).toBe('Welcome back, Asha');
    expect(translate('hi', 'palette.count.other', { count: 3 })).toBe('3 परिणाम');
    expect(translate('en', 'dashboard.welcome')).toBe('Welcome back, {name}');
  });

  it('ignores a hand-edited language setting', () => {
    window.localStorage.setItem(LOCALE_KEY, JSON.stringify('fr'));
    localeStore.reload();
    expect(localeStore.getSnapshot()).toBe('en');
  });
});

describe('choosing Hindi', () => {
  it('translates the menus and the dashboard, and keeps English pages marked as English', async () => {
    const user = userEvent.setup();
    renderRoute('/settings');
    await user.click(await screen.findByRole('radio', { name: 'हिन्दी' }));
    expect(document.documentElement.lang).toBe('hi');
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe('"hi"');
    const nav = screen.getAllByRole('navigation', { name: 'मुख्य' })[0];
    if (!nav) throw new Error('missing navigation');
    expect(within(nav).getByRole('link', { name: 'वाइवा अभ्यास' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'मुख्य सामग्री पर जाएँ' })).toBeInTheDocument();
    // The rest of Settings is in English, and says so to screen readers.
    expect(document.querySelector('main')).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('region', { name: 'भाषा' })).toHaveAttribute('lang', 'hi');
    expect(screen.getByText(/हिंदी अनुवाद AI की मदद से तैयार/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'डैशबोर्ड' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'आपका डैशबोर्ड' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).closest('[lang]')).toHaveAttribute(
      'lang',
      'hi',
    );
  });

  it('shows the command palette in Hindi', async () => {
    localeStore.set('hi');
    const user = userEvent.setup();
    renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'कहीं भी जाएँ' }));
    const dialog = await screen.findByRole('dialog', { name: 'कहीं भी जाएँ' });
    expect(within(dialog).getByRole('group', { name: 'कार्य' })).toBeInTheDocument();
    await user.type(within(dialog).getByRole('combobox'), 'zzzz');
    expect(within(dialog).getByText(/“zzzz” से कुछ नहीं मिला/)).toBeInTheDocument();
  });
});
