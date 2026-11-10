/**
 * Documents for a student's own project, drafted from what they entered in CampusKit: a README
 * and a viva preparation sheet. Nothing is made up. A part the project has no details for is
 * marked "To write" in the document and listed as missing, so the student knows what to add.
 * When the project started from a template, the template's setup, tests, features and viva
 * questions are included and labelled as coming from the template.
 */
import {
  VIVA_CATEGORY_LABELS,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';

import { formatIsoDate } from '../../lib/format.ts';
import type { Outcome, VivaProgress } from '../../lib/progress.ts';
import { progressOf, STATUS_LABELS, type WorkspaceProject } from '../../lib/workspace.ts';

export const DOCUMENTS = {
  readme: 'README',
  viva: 'Viva preparation sheet',
} as const;
export type DocumentKind = keyof typeof DOCUMENTS;

export interface DraftDocument {
  markdown: string;
  /** Parts with no details yet, in the order they appear. */
  missing: string[];
}

const PLATFORM_LABELS = { all: '', windows: ' (Windows)', 'macos-linux': ' (macOS and Linux)' };

function toWrite(text: string): string {
  return `_To write: ${text}_`;
}

function commandBlock(commands: ProjectManifest['setup']['steps'][number]['commands']): string[] {
  if (commands.length === 0) return [];
  return [
    '```',
    ...commands.map(
      (command) =>
        `${command.command}${PLATFORM_LABELS[command.platform] ? `   # ${PLATFORM_LABELS[command.platform].trim()}` : ''}`,
    ),
    '```',
  ];
}

export function projectReadme(
  project: WorkspaceProject,
  template: ProjectManifest | undefined,
  today: string,
): DraftDocument {
  const missing: string[] = [];
  const lines = [`# ${project.title}`, ''];

  if (project.description) lines.push(project.description, '');
  else {
    missing.push('A description of what the project does');
    lines.push(toWrite('what the project does and who it is for.'), '');
  }

  const { done, total } = progressOf(project);
  lines.push(
    '## Status',
    '',
    `${STATUS_LABELS[project.status]}.${total > 0 ? ` ${done} of ${total} milestones done.` : ''}`,
    '',
  );

  lines.push('## Technology', '');
  if (project.stack.length > 0) lines.push(...project.stack.map((item) => `- ${item}`), '');
  else if (template)
    lines.push(
      ...[...template.languages, ...template.frameworks].map((item) => `- ${item}`),
      '',
      `From the ${template.name} template it started from.`,
      '',
    );
  else {
    missing.push('The technology it uses');
    lines.push(toWrite('the languages, frameworks and tools it uses.'), '');
  }

  lines.push('## Features', '');
  if (template)
    lines.push(
      `Features of the ${template.name} template it started from. Remove any your project no longer has, and add your own.`,
      '',
      ...template.features.map((feature) => `- ${feature}`),
      '',
    );
  else {
    missing.push('Its features');
    lines.push(toWrite('what a user can do with it, one feature per line.'), '');
  }

  lines.push('## Getting started', '');
  if (template) {
    lines.push(
      'You need:',
      '',
      ...template.prerequisites.map(
        (item) => `- ${item.name}${item.version ? ` ${item.version}` : ''}`,
      ),
      '',
    );
    template.setup.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.title}`, '');
      const block = commandBlock(step.commands);
      if (block.length > 0) lines.push(...block, '');
    });
    if (template.setup.localUrl) lines.push(`Then open ${template.setup.localUrl}.`, '');
  } else {
    missing.push('How to install and run it');
    lines.push(toWrite('what to install and the commands to run it.'), '');
  }

  lines.push('## Tests', '');
  if (template)
    lines.push(
      `With ${template.testing.tools.join(', ')}:`,
      '',
      ...commandBlock(template.testing.commands),
      '',
    );
  else {
    missing.push('How to run its tests');
    lines.push(toWrite('how to run the tests, or say that there are none yet.'), '');
  }

  if (project.milestones.length > 0)
    lines.push(
      '## Roadmap',
      '',
      ...project.milestones.map(
        (item) =>
          `- [${item.done ? 'x' : ' '}] ${item.title}${item.due ? ` (due ${formatIsoDate(item.due)})` : ''}`,
      ),
      '',
    );

  if (template)
    lines.push('## Known limitations', '', ...template.limitations.map((item) => `- ${item}`), '');

  if (project.resources.length > 0)
    lines.push(
      '## Links',
      '',
      ...project.resources.map((item) => `- [${item.title}](${item.url})`),
      '',
    );

  lines.push(
    '---',
    '',
    `Drafted with CampusKit on ${formatIsoDate(today)} from this project’s details.`,
  );
  return { markdown: `${lines.join('\n').trim()}\n`, missing };
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  confident: 'you rated this confident',
  partly: 'needs a little more work',
  missed: 'review again',
};

export function vivaSheet(
  project: WorkspaceProject,
  template: { manifest: ProjectManifest; guide: LearningGuide; progress: VivaProgress } | undefined,
  today: string,
): DraftDocument {
  const missing: string[] = [];
  const lines = [`# Viva preparation: ${project.title}`, ''];

  lines.push('## Your project in a few sentences', '');
  if (project.description) lines.push(project.description, '');
  else {
    missing.push('A description to start your introduction from');
    lines.push(toWrite('what it does, who it’s for and why you built it.'), '');
  }

  lines.push('## Be ready to explain', '');
  const stack = project.stack.length
    ? project.stack
    : template
      ? [...template.manifest.languages, ...template.manifest.frameworks]
      : [];
  if (stack.length > 0)
    lines.push(
      ...stack.map((item) => `- Why you chose ${item}, and what it does in your project.`),
      '- How data moves through the project, from what the user does to what is stored.',
      '- What you would change or add with more time.',
      '',
    );
  else {
    missing.push('The technology it uses, so the sheet can list what to explain');
    lines.push(toWrite('the technology, then why you chose each part.'), '');
  }

  lines.push('## What you did', '');
  if (project.milestones.length > 0) {
    const done = project.milestones.filter((item) => item.done);
    const open = project.milestones.filter((item) => !item.done);
    if (done.length > 0) lines.push('Done:', '', ...done.map((item) => `- ${item.title}`), '');
    if (open.length > 0)
      lines.push(
        'Still to do (examiners often ask what’s left):',
        '',
        ...open.map((item) => `- ${item.title}`),
        '',
      );
  } else {
    missing.push('Milestones, to show what you did and what’s left');
    lines.push(toWrite('the main steps of the work, from your milestones.'), '');
  }

  if (project.notes.trim()) lines.push('## Your notes', '', project.notes.trim(), '');

  lines.push('## Practice questions', '');
  if (template) {
    lines.push(
      `From the ${template.manifest.name} template’s viva questions, with your own ratings from viva practice. Practise them with model answers in CampusKit.`,
      '',
    );
    const byCategory = new Map<string, string[]>();
    for (const question of template.guide.viva) {
      const label = VIVA_CATEGORY_LABELS[question.category];
      const entry = template.progress.questions[question.id];
      const status = entry ? OUTCOME_LABELS[entry.outcome] : 'not practised yet';
      byCategory.set(label, [
        ...(byCategory.get(label) ?? []),
        `- ${question.question} (${status})`,
      ]);
    }
    for (const [label, questions] of byCategory) lines.push(`### ${label}`, '', ...questions, '');
  } else {
    missing.push('Practice questions: link the project to a template to include its questions');
    lines.push(
      toWrite('questions you expect, or link the project to a template to include its questions.'),
      '',
    );
  }

  lines.push(
    '---',
    '',
    `Made with CampusKit on ${formatIsoDate(today)} from this project’s details.`,
  );
  return { markdown: `${lines.join('\n').trim()}\n`, missing };
}
