/** Every keyboard shortcut CampusKit has, in one list (opened with ? or from the palette). */
import { Dialog } from '../../components/ui/Dialog.tsx';
import type { MessageKey } from '../../i18n/en.ts';
import { useT } from '../../lib/i18n.ts';

export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const PALETTE_KEYS = IS_MAC ? '⌘ K' : 'Ctrl K';

const SHORTCUTS: Array<{ area: MessageKey; items: Array<[string, MessageKey]> }> = [
  {
    area: 'shortcuts.everywhere',
    items: [
      [PALETTE_KEYS, 'shortcuts.palette'],
      ['?', 'shortcuts.show'],
      ['Esc', 'shortcuts.close'],
    ],
  },
  {
    area: 'shortcuts.demo',
    items: [['← →', 'shortcuts.demoScreens']],
  },
  {
    area: 'shortcuts.presentation',
    items: [
      ['→  Page Down', 'shortcuts.next'],
      ['←  Page Up', 'shortcuts.previous'],
      ['N', 'shortcuts.notes'],
      ['Esc', 'shortcuts.leave'],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open onClose={onClose} title={t('shortcuts.title')}>
      <div className="space-y-5">
        {SHORTCUTS.map(({ area, items }) => (
          <section key={area} aria-label={t(area)} className="space-y-2">
            <h3 className="font-semibold text-ink">{t(area)}</h3>
            <dl className="divide-y divide-line rounded-xl border border-line text-sm">
              {items.map(([keys, action]) => (
                <div key={`${area}-${keys}`} className="flex items-start gap-4 px-3 py-2.5">
                  <dt className="w-28 shrink-0">
                    <kbd className="rounded-md border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">
                      {keys}
                    </kbd>
                  </dt>
                  <dd className="text-ink-2">{t(action)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="type-meta">{t('shortcuts.typing', { keys: PALETTE_KEYS })}</p>
      </div>
    </Dialog>
  );
}
