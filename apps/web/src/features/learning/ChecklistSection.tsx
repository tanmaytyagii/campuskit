import {
  CHECKLIST_AREA_LABELS,
  CHECKLIST_AREAS,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Checkbox } from '../../components/ui/Field.tsx';
import { readTicked, resetProgress, writeTicked } from '../../lib/progress.ts';
import { fileHref, vivaHref } from './links.ts';

/** “Can I explain this?” items, ticked by the student and saved in this browser only. */
export function ChecklistSection({
  project,
  guide,
}: {
  project: ProjectManifest;
  guide: LearningGuide;
}) {
  const ids = guide.checklist.map((item) => item.id);
  const [done, setDone] = useState(() => readTicked('checklist', project.id, ids));
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const total = guide.checklist.length;

  function toggle(id: string, checked: boolean) {
    const next = new Set(done);
    if (checked) next.add(id);
    else next.delete(id);
    setDone(next);
    writeTicked('checklist', project.id, next);
  }

  function reset() {
    resetProgress('checklist', project.id);
    setDone(new Set());
    setConfirming(false);
    setNotice('The checklist was cleared.');
  }

  return (
    <div className="space-y-8">
      <p className="max-w-[70ch] text-ink-2">
        Tick an item only when you can explain it without looking, for example to a friend or in
        front of a mirror. Ticks are saved in this browser only.
      </p>

      <div className="max-w-xl space-y-2">
        <p className="font-semibold text-ink" aria-live="polite">
          {done.size} of {total} ticked
        </p>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${total === 0 ? 0 : (done.size / total) * 100}%` }}
          />
        </div>
      </div>

      {done.size === total && total > 0 ? (
        <Callout tone="success" title="Everything is ticked">
          Now practise saying it aloud:{' '}
          <Link to={vivaHref(project)} className="link">
            try the viva questions
          </Link>
          .
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {CHECKLIST_AREAS.map((area) => {
          const items = guide.checklist.filter((item) => item.area === area);
          if (items.length === 0) return null;
          return (
            <fieldset
              key={area}
              className="overflow-hidden rounded-xl border border-line bg-surface"
            >
              {/* Floated so the legend sits inside the card as its header, not on the border. */}
              <legend className="float-left flex w-full items-center justify-between gap-3 border-b border-line bg-raised/50 px-5 py-3">
                <span className="text-sm font-bold text-ink">{CHECKLIST_AREA_LABELS[area]}</span>
                <span aria-hidden="true" className="type-meta font-mono">
                  {items.filter((item) => done.has(item.id)).length}/{items.length}
                </span>
              </legend>
              <div className="clear-both space-y-4 p-5">
                {items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <Checkbox
                      label={item.text}
                      description={item.how}
                      checked={done.has(item.id)}
                      onChange={(event) => toggle(item.id, event.target.checked)}
                    />
                    {item.file ? (
                      <Link
                        to={fileHref(project, item.file)}
                        className="ml-[1.9rem] inline-block font-mono text-xs text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-violet hover:decoration-violet"
                      >
                        {item.file}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <ButtonLink to={vivaHref(project)}>Practise viva questions</ButtonLink>
        <Button
          variant="ghost"
          onClick={() => setConfirming(true)}
          disabled={done.size === 0}
          icon={<RotateCcw aria-hidden="true" className="size-4" />}
        >
          Reset checklist
        </Button>
        {notice ? (
          <p role="status" className="text-sm text-ink-2">
            {notice}
          </p>
        ) : null}
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset the checklist?"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reset}>
              Reset checklist
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This clears all {done.size} ticks for {project.name} in this browser.
        </p>
      </Dialog>
    </div>
  );
}
