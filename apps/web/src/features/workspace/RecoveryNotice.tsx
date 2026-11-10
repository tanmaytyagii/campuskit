/**
 * Shown when saved project data couldn't be read. That data was kept aside, never dropped:
 * the student can download it (to fix by hand, or to send with a bug report) or delete it.
 */
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { downloadFile } from '../../lib/download.ts';
import { pluralize, todayIso } from '../../lib/format.ts';
import { clearRecovery, readRecovery } from '../../lib/workspace.ts';

export function RecoveryNotice() {
  const [kept, setKept] = useState(readRecovery);
  const [confirming, setConfirming] = useState(false);
  if (kept.length === 0) return null;
  return (
    <Callout tone="warn" title="Some saved project data couldn’t be read">
      <p>
        {pluralize(kept.length, 'entry', 'entries')} in this browser’s saved projects didn’t have
        the expected form, perhaps after being edited by hand. They were kept aside, not deleted,
        and the rest of your projects work as usual.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Download aria-hidden="true" className="size-4" />}
          onClick={() =>
            downloadFile(
              `${JSON.stringify(kept, null, 2)}\n`,
              `campuskit-unreadable-projects-${todayIso()}.json`,
              'application/json',
            )
          }
        >
          Download the unreadable data
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          onClick={() => setConfirming(true)}
        >
          Delete it
        </Button>
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete the unreadable data?"
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearRecovery();
                setConfirming(false);
                setKept([]);
              }}
            >
              Delete it
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          It can’t be brought back afterwards. Download it first if you might want to fix it by
          hand.
        </p>
      </Dialog>
    </Callout>
  );
}
