/**
 * Settings: the profile from the welcome guide, the colour theme, the guide itself, and the
 * student's data in this browser (backups, or deleting everything CampusKit saved).
 */
import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Checkbox, SelectField, TextField } from '../../components/ui/Field.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useTheme, type ThemePreference } from '../../hooks/useTheme.tsx';
import {
  INTEREST_LABELS,
  INTERESTS,
  LEVEL_LABELS,
  LEVELS,
  MAX_NAME,
  profileStore,
  useProfile,
  type Level,
  type Profile,
} from '../../lib/profile.ts';
import { aiKeyStore } from '../../lib/ai.ts';
import { localeStore, LOCALE_NAMES, LOCALES, translate, useLocale } from '../../lib/i18n.ts';
import { cacheAllTemplates, offlineReady } from '../../lib/service-worker.ts';
import { workspaceStore } from '../../lib/workspace.ts';

const card = 'space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-card';

const THEMES: Array<[ThemePreference, string]> = [
  ['system', 'Match my device'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

/** Removes every value CampusKit saved in this browser (both storages); returns how many. */
export function deleteAllCampusKitData(): number {
  let removed = 0;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
        (key): key is string => key !== null && key.startsWith('campuskit:'),
      );
      for (const key of keys) storage.removeItem(key);
      removed += keys.length;
    } catch {
      // Storage is unavailable: there is nothing to delete.
    }
  }
  workspaceStore.reload();
  profileStore.reload();
  localeStore.reload();
  // The AI key may be held only in memory; forget it too.
  aiKeyStore.forget();
  return removed;
}

export function SettingsPage() {
  useDocumentTitle('Settings');
  const saved = useProfile();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Profile>(saved);
  const [confirming, setConfirming] = useState(false);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = profileStore.update(() => draft);
    notify(
      ok
        ? 'Saved your profile.'
        : 'Your profile couldn’t be saved: the browser’s storage is full or blocked.',
      ok ? 'success' : 'error',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Your profile, how CampusKit looks, and your data. Everything is saved in this browser only."
      />
      <div className="container-page max-w-3xl space-y-6 pb-16">
        <section aria-labelledby="profile-heading" className={card}>
          <h2 id="profile-heading" className="type-h3 text-ink">
            Profile
          </h2>
          <form onSubmit={saveProfile} className="space-y-5" noValidate>
            <TextField
              label="First name"
              optional
              autoComplete="given-name"
              maxLength={MAX_NAME}
              description="Used only to greet you on your dashboard."
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
            <SelectField
              label="Where you’re studying"
              value={draft.level ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  level: event.target.value ? (event.target.value as Level) : null,
                })
              }
            >
              <option value="">Not saying</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </SelectField>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-ink">Interests</legend>
              {INTERESTS.map((interest) => (
                <Checkbox
                  key={interest}
                  label={INTEREST_LABELS[interest]}
                  checked={draft.interests.includes(interest)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      interests: event.target.checked
                        ? [...draft.interests, interest]
                        : draft.interests.filter((item) => item !== interest),
                    })
                  }
                />
              ))}
            </fieldset>
            <Button type="submit">Save profile</Button>
          </form>
        </section>

        <section aria-labelledby="appearance-heading" className={card}>
          <h2 id="appearance-heading" className="type-h3 text-ink">
            Appearance
          </h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">Colour theme</legend>
            {THEMES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 text-sm text-ink">
                <input
                  type="radio"
                  name="theme"
                  className="size-4 accent-violet"
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        <LanguageSection />

        <OfflineSection />

        <section aria-labelledby="guide-heading" className={card}>
          <h2 id="guide-heading" className="type-h3 text-ink">
            Welcome guide
          </h2>
          <p className="text-sm text-ink-2">
            Answer the three questions again to get new template suggestions or a sample project.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              profileStore.update((current) => ({ ...current, onboarded: false }));
              void navigate('/welcome');
            }}
          >
            Open the welcome guide
          </Button>
        </section>

        <section aria-labelledby="data-heading" className={card}>
          <h2 id="data-heading" className="type-h3 text-ink">
            Your data
          </h2>
          <p className="text-sm text-ink-2">
            CampusKit keeps everything in this browser and sends nothing anywhere. To move it to
            another computer, download a backup on{' '}
            <Link to="/my-projects" className="link">
              My projects
            </Link>
            .
          </p>
          <Button
            variant="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
            onClick={() => setConfirming(true)}
          >
            Delete all CampusKit data in this browser
          </Button>
        </section>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete all CampusKit data in this browser?"
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const removed = deleteAllCampusKitData();
                setConfirming(false);
                setDraft(profileStore.getSnapshot());
                notify(
                  removed > 0
                    ? 'Deleted everything CampusKit saved in this browser.'
                    : 'There was nothing to delete.',
                );
              }}
            >
              Delete everything
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-ink-2">
          <p>
            This deletes your projects, notes and milestones, template progress, viva ratings,
            report drafts, readiness confirmations, recent pages, your profile and your theme
            choice. It can’t be undone.
          </p>
          <p>Download a backup first if you might want any of it again.</p>
        </div>
      </Dialog>
    </>
  );
}

function OfflineSection() {
  const [ready] = useState(offlineReady);
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  async function storeTemplates() {
    setState('working');
    try {
      const count = await cacheAllTemplates();
      setState('done');
      notify(`Stored ${count} templates for offline use.`);
    } catch {
      setState('idle');
      notify('The templates couldn’t be stored. Check your connection and try again.', 'error');
    }
  }

  return (
    <section aria-labelledby="offline-heading" className={card}>
      <h2 id="offline-heading" className="type-h3 text-ink">
        Offline use
      </h2>
      <p className="text-sm text-ink-2">
        {ready
          ? 'CampusKit is stored in this browser, so it opens without a connection: your projects, progress, viva practice and the pages you’ve visited work offline. You can also install it from your browser’s menu.'
          : 'Offline use starts after CampusKit has been opened once with a connection in a browser that supports it (most do). Your saved work is in this browser either way.'}
      </p>
      {ready ? (
        <>
          <p className="text-sm text-ink-2">
            Templates you haven’t opened yet need a connection to generate. Store all of them now to
            generate projects offline too (about 2 MB).
          </p>
          <Button
            variant="secondary"
            disabled={state !== 'idle'}
            onClick={() => void storeTemplates()}
          >
            {state === 'working'
              ? 'Storing the templates…'
              : state === 'done'
                ? 'Every template is stored'
                : 'Store every template for offline use'}
          </Button>
        </>
      ) : null}
    </section>
  );
}

/** The language of the menus. Written in the chosen language, so it marks its own lang. */
function LanguageSection() {
  const locale = useLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <section aria-labelledby="language-heading" className={card} lang={locale}>
      <h2 id="language-heading" className="type-h3 text-ink">
        {t('language.heading')}
      </h2>
      <p className="text-sm text-ink-2">{t('language.description')}</p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">{t('language.label')}</legend>
        {LOCALES.map((value) => (
          <label key={value} lang={value} className="flex items-center gap-3 text-sm text-ink">
            <input
              type="radio"
              name="language"
              className="size-4 accent-violet"
              checked={locale === value}
              onChange={() => {
                if (!localeStore.set(value))
                  notify(
                    'The language couldn’t be saved: the browser’s storage is blocked.',
                    'error',
                  );
              }}
            />
            {LOCALE_NAMES[value]}
          </label>
        ))}
      </fieldset>
      {locale === 'hi' ? <p className="type-meta">{t('language.review')}</p> : null}
    </section>
  );
}
