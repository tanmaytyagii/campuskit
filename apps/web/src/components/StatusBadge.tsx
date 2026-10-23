import type { ProjectManifest, TemplateStatusId } from '@campuskit/project-catalog';
import { CircleCheck, Clock, PencilLine, TriangleAlert } from 'lucide-react';
import type { ComponentProps } from 'react';

import { getTemplateStatus } from '../lib/verification.ts';
import { Badge } from './ui/Badge.tsx';

const TONES: Record<TemplateStatusId, ComponentProps<typeof Badge>['tone']> = {
  verified: 'lime',
  'awaiting-verification': 'outline',
  'needs-attention': 'warn',
  draft: 'neutral',
};

const ICONS = {
  verified: CircleCheck,
  'awaiting-verification': Clock,
  'needs-attention': TriangleAlert,
  draft: PencilLine,
} as const;

/** The template's verification status. The label is the full meaning; the icon is decoration. */
export function StatusBadge({ project }: { project: ProjectManifest }) {
  const status = getTemplateStatus(project);
  const Icon = ICONS[status.id];
  return (
    <Badge tone={TONES[status.id]}>
      <Icon aria-hidden="true" className="size-3.5" />
      {status.label}
    </Badge>
  );
}
