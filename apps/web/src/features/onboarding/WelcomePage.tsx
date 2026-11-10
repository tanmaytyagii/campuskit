/**
 * The welcome guide for a first visit: about you, your interests, and templates suggested by
 * written rules, with an optional sample project. Every step can be skipped, and everything can
 * be changed later in Settings. Saved in this browser only.
 */
import { catalog } from '@campuskit/project-catalog';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Checkbox, TextField } from '../../components/ui/Field.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import {
  INTEREST_LABELS,
  INTERESTS,
  LEVEL_LABELS,
  LEVELS,
  MAX_NAME,
  profileStore,
  recommendTemplates,
  useProfile,
  type Profile,
} from '../../lib/profile.ts';
import { addMilestone, createProject, WorkspaceFullError } from '../../lib/workspace.ts';
import { projectHref } from '../workspace/ProjectsSection.tsx';
import { changeWorkspace } from '../workspace/useWorkspace.ts';

const STEPS = ['About you', 'Your interests', 'Suggested templates'] as const;

/** First steps for a sample project: things to do, never results to claim. */
export const SAMPLE_MILESTONES = [
  'Run the project on your computer',
  'Read the architecture in the learning studio',
  'Customize it for your institution',
  'Practise the viva questions',
  'Draft the project report',
];

export function WelcomePage() {
  useDocumentTitle('Welcome');
  const saved = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(saved);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Each step starts at its heading, so screen readers announce where the student is.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  function save(onboarded: boolean) {
    profileStore.update(() => ({ ...draft, onboarded }));
  }

  function finish(message: string) {
    save(true);
    notify(message);
    void navigate('/dashboard');
  }

  function createSample(templateId: string) {
    const template = catalog.find((project) => project.id === templateId);
    if (!template) return;
    try {
      let id = '';
      changeWorkspace((state) => {
        const now = new Date().toISOString();
        const created = createProject(
          state,
          {
            title: `Sample: ${template.name}`,
            description: template.tagline,
            category:
              template.category === 'web-development'
                ? 'web'
                : template.category === 'data-analysis'
                  ? 'data'
                  : 'ai-ml',
            status: 'planning',
            tags: ['sample'],
            stack: [...template.languages, ...template.frameworks],
            templateId: template.id,
          },
          now,
        );
        id = created.project.id;
        return SAMPLE_MILESTONES.reduce(
          (next, title) => addMilestone(next, id, { title, due: null }, now),
          created.state,
        );
      }, `Created a sample project from ${template.name}.`);
      save(true);
      if (id) void navigate(projectHref({ id }));
    } catch (error) {
      if (error instanceof WorkspaceFullError) notify(error.message, 'error');
      else throw error;
    }
  }

  const recommendations = recommendTemplates(draft).slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Welcome"
        title="Set up CampusKit"
        description="Three quick questions so CampusKit can suggest templates. Everything is optional, saved only in this browser, and can be changed in Settings."
      />
      <div className="container-page max-w-3xl pb-16">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <p className="type-meta" aria-live="polite">
            Step {step + 1} of {STEPS.length}
          </p>
          <ol className="mt-2 mb-6 grid grid-cols-3 gap-2" aria-label="Steps">
            {STEPS.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? 'step' : undefined}
                className={
                  index <= step
                    ? 'border-t-4 border-violet pt-2 text-xs font-semibold text-ink'
                    : 'border-t-4 border-line pt-2 text-xs text-ink-3'
                }
              >
                {label}
              </li>
            ))}
          </ol>
          <h2 ref={heading} tabIndex={-1} className="type-h2 text-ink outline-none">
            {STEPS[step]}
          </h2>

          {step === 0 ? (
            <div className="mt-5 space-y-6">
              <TextField
                label="Your first name"
                optional
                description="Only used to greet you on your dashboard."
                autoComplete="given-name"
                maxLength={MAX_NAME}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-ink">
                  Where are you studying? <span className="font-normal text-ink-3">(optional)</span>
                </legend>
                {LEVELS.map((level) => (
                  <label key={level} className="flex items-center gap-3 text-sm text-ink">
                    <input
                      type="radio"
                      name="level"
                      className="size-4 accent-violet"
                      checked={draft.level === level}
                      onChange={() => setDraft({ ...draft, level })}
                    />
                    {LEVEL_LABELS[level]}
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}

          {step === 1 ? (
            <fieldset className="mt-5 space-y-3">
              <legend className="text-sm text-ink-2">
                Choose any that interest you. They decide which templates are suggested.
              </legend>
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
          ) : null}

          {step === 2 ? (
            <div className="mt-5 space-y-4">
              {recommendations.length === 0 ? (
                <p className="text-ink-2">
                  No template matches those interests yet. Browse all{' '}
                  <Link to="/projects" className="link">
                    templates
                  </Link>
                  , or go back and choose other interests.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recommendations.map(({ project, reasons }) => (
                    <li key={project.id} className="space-y-2 rounded-xl border border-line p-4">
                      <h3 className="font-semibold text-ink">{project.name}</h3>
                      <p className="text-sm text-ink-2">{project.tagline}</p>
                      {reasons.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
                          {reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={() => createSample(project.id)}>
                          Start a sample project{' '}
                          <span className="sr-only">from {project.name}</span>
                        </Button>
                        <ButtonLink to={`/projects/${project.slug}`} size="sm" variant="secondary">
                          Look at the template <span className="sr-only">{project.name}</span>
                        </ButtonLink>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="type-meta">
                Suggested by written rules: one point for each interest a template matches, and one
                when its difficulty suits your level.
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <Button
              variant="ghost"
              onClick={() => finish('Setup skipped. You can do it later in Settings.')}
            >
              Skip setup
            </Button>
            <div className="flex flex-wrap gap-2">
              {step > 0 ? (
                <Button variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => {
                    save(false);
                    setStep(step + 1);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={() => finish('You’re all set.')}>Go to my dashboard</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
