/**
 * The optional AI assistant. Everything else in CampusKit works without it. To use it, the student
 * adds their own API key, picks a task, reviews exactly what will be sent and to whom, and only
 * then sends it. Answers are labelled as written by AI and are never saved.
 */
import { catalog } from '@campuskit/project-catalog';
import { Bot, Download, KeyRound, Send, Square } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { useOnline } from '../../components/layout/OfflineNotice.tsx';
import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { MarkdownView } from '../../components/MarkdownView.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Checkbox, SelectField, TextareaField, TextField } from '../../components/ui/Field.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import {
  aiKeyStore,
  AiError,
  anthropicProvider,
  MAX_LIMIT,
  readLimit,
  readUsage,
  recordUse,
  saveLimit,
  useAiKey,
  type AiResult,
} from '../../lib/ai.ts';
import { downloadFile } from '../../lib/download.ts';
import { todayIso } from '../../lib/format.ts';
import { loadLearningGuide } from '../../lib/learning.ts';
import { useWorkspace } from '../workspace/useWorkspace.ts';
import {
  architectureRequest,
  codeRequest,
  docsRequest,
  errorRequest,
  MAX_PASTE,
  roadmapRequest,
  TASKS,
  templateMaterial,
  vivaRequest,
  workspaceDescription,
  type AssistantRequest,
  type TaskId,
} from './prompts.ts';

const provider = anthropicProvider;

type Answer =
  | { state: 'idle' }
  | { state: 'streaming'; text: string }
  | { state: 'finished'; result: AiResult }
  | { state: 'failed'; message: string; text: string };

export function AssistantPage() {
  useDocumentTitle('AI assistant');
  const online = useOnline();
  const { key } = useAiKey();
  const [limit, setLimit] = useState(readLimit);
  const [used, setUsed] = useState(readUsage);
  const [review, setReview] = useState<AssistantRequest | null>(null);
  const [answer, setAnswer] = useState<Answer>({ state: 'idle' });
  const controller = useRef<AbortController | null>(null);

  // Stops a request still streaming when the student leaves the page.
  useEffect(() => () => controller.current?.abort(), []);

  const remaining = Math.max(0, limit - used);
  const blocker = !online
    ? 'You’re offline, so nothing can be sent. Everything else in CampusKit still works.'
    : !key
      ? 'Add your API key above to send requests.'
      : remaining === 0
        ? `You’ve used all ${limit} requests for this tab. Raise the limit above, or open a new tab.`
        : null;

  async function send(request: AssistantRequest) {
    setReview(null);
    if (!recordUse(limit)) {
      setUsed(readUsage());
      return;
    }
    setUsed(readUsage());
    const abort = new AbortController();
    controller.current = abort;
    setAnswer({ state: 'streaming', text: '' });
    let latest = '';
    try {
      const result = await provider.stream(request, {
        apiKey: key,
        signal: abort.signal,
        onText: (text) => {
          latest = text;
          setAnswer({ state: 'streaming', text });
        },
      });
      setAnswer({ state: 'finished', result });
    } catch (error) {
      setAnswer({
        state: 'failed',
        message: error instanceof AiError ? error.message : 'Something went wrong. Try again.',
        text: latest,
      });
    } finally {
      controller.current = null;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Optional"
        title="AI assistant"
        description="Ask Claude to explain a template, your code or an error, or to suggest viva questions and a learning plan. It’s optional: you use your own API key, you see exactly what will be sent before anything leaves your browser, and nothing is saved."
      />
      <div className="container-page grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <TaskForm disabledReason={blocker} onReview={setReview} />
          <AnswerSection answer={answer} onStop={() => controller.current?.abort()} />
        </div>
        <aside className="space-y-6" aria-label="Assistant settings">
          <KeySettings />
          <LimitSettings
            limit={limit}
            used={used}
            onChange={(next) => {
              if (saveLimit(next)) setLimit(readLimit());
              else
                notify('The limit couldn’t be saved: the browser’s storage is blocked.', 'error');
            }}
          />
          <WithoutAi />
        </aside>
      </div>
      <ReviewDialog
        request={review}
        blocker={blocker}
        remaining={remaining}
        onCancel={() => setReview(null)}
        onSend={(request) => void send(request)}
      />
    </>
  );
}

function KeySettings() {
  const { key, keepForTab } = useAiKey();
  const [draft, setDraft] = useState('');
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!provider.keyPattern.test(value)) {
      setError(`That doesn’t look like an ${provider.name} API key. ${provider.keyHint}`);
      return;
    }
    aiKeyStore.set(value, keep);
    setDraft('');
    setError(undefined);
    notify(keep ? 'Key added until you close this tab.' : 'Key added until you leave or reload.');
  }

  return (
    <section
      aria-labelledby="key-heading"
      className="space-y-4 rounded-2xl border border-line bg-surface p-5"
    >
      <h2 id="key-heading" className="type-h3 flex items-center gap-2 text-ink">
        <KeyRound aria-hidden="true" className="size-5 text-violet" />
        Your API key
      </h2>
      <p className="text-sm text-ink-2">
        Provider: <strong className="text-ink">{provider.name}</strong>, model{' '}
        <code>{provider.model}</code>. Requests use your account and its pricing.
      </p>
      {key ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">
            A key ending in <code>{key.slice(-4)}</code> is in use,{' '}
            {keepForTab
              ? 'kept until you close this tab.'
              : 'kept in memory until you leave or reload the page.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => aiKeyStore.forget()}>
            Forget the key
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-3">
          <TextField
            label="API key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            description={provider.keyHint}
            error={error}
          />
          <Checkbox
            label="Keep it until I close this tab"
            description="Otherwise it’s forgotten when you leave or reload. It’s never saved in backups or for later visits."
            checked={keep}
            onChange={(event) => setKeep(event.target.checked)}
          />
          <Button type="submit" size="sm">
            Use this key
          </Button>
        </form>
      )}
    </section>
  );
}

function LimitSettings({
  limit,
  used,
  onChange,
}: {
  limit: number;
  used: number;
  onChange: (limit: number) => void;
}) {
  const [draft, setDraft] = useState(String(limit));
  const [error, setError] = useState<string | undefined>();
  return (
    <section
      aria-labelledby="limit-heading"
      className="space-y-3 rounded-2xl border border-line bg-surface p-5"
    >
      <h2 id="limit-heading" className="type-h3 text-ink">
        Request limit
      </h2>
      <p className="text-sm text-ink-2">
        <strong className="text-ink">
          {used} of {limit}
        </strong>{' '}
        requests used in this tab. Each request you send counts once.
      </p>
      <form
        noValidate
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(draft);
          if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
            setError(`Enter a whole number from 1 to ${MAX_LIMIT}.`);
            return;
          }
          setError(undefined);
          onChange(value);
        }}
      >
        <TextField
          label="Requests per tab"
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={error}
          containerClassName="w-40"
        />
        <Button type="submit" size="sm" variant="secondary" className="mb-0.5">
          Save limit
        </Button>
      </form>
    </section>
  );
}

function WithoutAi() {
  return (
    <section
      aria-labelledby="without-heading"
      className="space-y-2 rounded-2xl border border-line bg-raised p-5 text-sm text-ink-2"
    >
      <h2 id="without-heading" className="type-h3 text-ink">
        Without AI
      </h2>
      <p>Everything here was written and checked by people, and works offline:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <Link to="/learn" className="link">
            Learning center
          </Link>
          : architecture, code walkthroughs and troubleshooting for each template
        </li>
        <li>
          <Link to="/viva" className="link">
            Viva practice
          </Link>
          : questions with model answers
        </li>
        <li>
          <Link to="/learn/report" className="link">
            Report builder
          </Link>
          : a project report from your details
        </li>
      </ul>
    </section>
  );
}

type Source = `template:${string}` | `project:${string}`;

function TaskForm({
  disabledReason,
  onReview,
}: {
  disabledReason: string | null;
  onReview: (request: AssistantRequest) => void;
}) {
  const workspace = useWorkspace();
  const projects = workspace.projects.filter((project) => !project.archivedAt);
  const [task, setTask] = useState<TaskId>('architecture');
  const [templateId, setTemplateId] = useState(catalog[0]?.id ?? '');
  const [source, setSource] = useState<Source>(
    projects[0] ? `project:${projects[0].id}` : `template:${catalog[0]?.id ?? ''}`,
  );
  const [count, setCount] = useState('8');
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [preparing, setPreparing] = useState(false);

  const needsText = task === 'code' || task === 'error' || task === 'docs';
  const textLabel =
    task === 'code' ? 'Code to explain' : task === 'error' ? 'Error output' : 'Documentation';

  async function material(value: string): Promise<string | null> {
    if (value.startsWith('project:')) {
      const project = projects.find((item) => `project:${item.id}` === value);
      return project ? workspaceDescription(project) : null;
    }
    const template = catalog.find((item) => `template:${item.id}` === value);
    if (!template) return null;
    const loaded = await loadLearningGuide(template);
    return loaded ? templateMaterial(template, loaded.guide) : null;
  }

  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (needsText && !text.trim()) {
      setError(`Paste the ${textLabel.toLowerCase()} first.`);
      return;
    }
    setError(undefined);
    setPreparing(true);
    try {
      const request = await build();
      if (request) onReview(request);
      else notify('That project’s details couldn’t be loaded. Try again.', 'error');
    } catch {
      notify(
        'That project’s details couldn’t be loaded. Check your connection and try again.',
        'error',
      );
    } finally {
      setPreparing(false);
    }
  }

  async function build(): Promise<AssistantRequest | null> {
    switch (task) {
      case 'architecture': {
        const found = await material(`template:${templateId}`);
        return found ? architectureRequest(found) : null;
      }
      case 'viva': {
        const found = await material(source);
        return found ? vivaRequest(found, Number(count)) : null;
      }
      case 'roadmap': {
        const found = await material(source);
        return found ? roadmapRequest(found) : null;
      }
      case 'code':
        return codeRequest(text, context);
      case 'error':
        return errorRequest(text, context);
      case 'docs':
        return docsRequest(text);
    }
  }

  return (
    <section
      aria-labelledby="task-heading"
      className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-card"
    >
      <h2 id="task-heading" className="type-h2 text-ink">
        What would you like help with?
      </h2>
      <form onSubmit={(event) => void prepare(event)} noValidate className="space-y-5">
        <SelectField
          label="Task"
          value={task}
          onChange={(event) => {
            setTask(event.target.value as TaskId);
            setError(undefined);
          }}
        >
          {Object.entries(TASKS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </SelectField>

        {task === 'architecture' ? (
          <SelectField
            label="Template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            description="Its architecture from the learning studio is sent: layers, components and data flows."
          >
            {catalog.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectField>
        ) : null}

        {task === 'viva' || task === 'roadmap' ? (
          <SelectField
            label="Project"
            value={source}
            onChange={(event) => setSource(event.target.value as Source)}
            description="For your own project, its title, description, status, technology, milestones and notes are sent. Tags, links and the timeline aren’t."
          >
            {projects.length > 0 ? (
              <optgroup label="Your projects">
                {projects.map((project) => (
                  <option key={project.id} value={`project:${project.id}`}>
                    {project.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Templates">
              {catalog.map((project) => (
                <option key={project.id} value={`template:${project.id}`}>
                  {project.name}
                </option>
              ))}
            </optgroup>
          </SelectField>
        ) : null}

        {task === 'viva' ? (
          <SelectField
            label="Number of questions"
            value={count}
            onChange={(event) => setCount(event.target.value)}
          >
            {['5', '8', '12'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
        ) : null}

        {needsText ? (
          <>
            <TextareaField
              label={textLabel}
              value={text}
              maxLength={MAX_PASTE}
              onChange={(event) => setText(event.target.value)}
              error={error}
              description={`Up to ${MAX_PASTE.toLocaleString('en-GB')} characters. Remove passwords, keys and personal details first.`}
              font={task === 'docs' ? 'sans' : 'mono'}
              className="min-h-48"
            />
            {task !== 'docs' ? (
              <TextField
                label="What it’s from"
                optional
                value={context}
                maxLength={300}
                onChange={(event) => setContext(event.target.value)}
                description="For example: “Flask route that saves a student” or “npm run build”."
              />
            ) : null}
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            icon={<Send aria-hidden="true" className="size-4" />}
            disabled={preparing}
          >
            {preparing ? 'Preparing…' : 'Review what will be sent'}
          </Button>
          {disabledReason ? <p className="type-meta">{disabledReason}</p> : null}
        </div>
      </form>
    </section>
  );
}

function ReviewDialog({
  request,
  blocker,
  remaining,
  onCancel,
  onSend,
}: {
  request: AssistantRequest | null;
  blocker: string | null;
  remaining: number;
  onCancel: () => void;
  onSend: (request: AssistantRequest) => void;
}) {
  return (
    <Dialog
      open={request !== null}
      onClose={onCancel}
      title="Review before sending"
      variant="wide"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {blocker ? <p className="type-meta mr-auto">{blocker}</p> : null}
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            icon={<Send aria-hidden="true" className="size-4" />}
            disabled={blocker !== null}
            onClick={() => {
              if (request) onSend(request);
            }}
          >
            Send to {provider.name}
          </Button>
        </div>
      }
    >
      {request ? (
        <div className="space-y-4 text-sm text-ink-2">
          <p>
            Nothing has been sent yet. If you agree, exactly the text below goes from your browser
            to <strong className="text-ink">{provider.name}</strong> at{' '}
            <code>{provider.endpoint}</code>, for the model <code>{provider.model}</code>. It counts
            as one of your {remaining} remaining requests for this tab. Your name, other projects
            and progress aren’t sent.
          </p>
          <ReviewBlock label="Instructions for the model" text={request.system} />
          <ReviewBlock label="Your material" text={request.user} />
        </div>
      ) : null}
    </Dialog>
  );
}

function ReviewBlock({ label, text }: { label: string; text: string }) {
  return (
    <section aria-label={label} className="space-y-1.5">
      <h3 className="text-sm font-semibold text-ink">{label}</h3>
      <pre
        tabIndex={0}
        className="max-h-72 overflow-auto rounded-xl border border-line bg-raised p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-ink"
      >
        {text}
      </pre>
    </section>
  );
}

function AnswerSection({ answer, onStop }: { answer: Answer; onStop: () => void }) {
  if (answer.state === 'idle') return null;
  const text = answer.state === 'finished' ? answer.result.text : answer.text;
  const streaming = answer.state === 'streaming';
  return (
    <section
      aria-labelledby="answer-heading"
      aria-busy={streaming}
      className="space-y-4 rounded-2xl border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="answer-heading" className="type-h2 flex items-center gap-2 text-ink">
          <Bot aria-hidden="true" className="size-6 text-violet" />
          Answer
        </h2>
        <Badge tone="violet">Written by AI</Badge>
      </div>
      <p className="type-meta">
        Check it against your own code and the template’s guide before you rely on it. It isn’t
        saved: download it if you want to keep it.
      </p>
      <div role="status" className="text-sm font-semibold text-ink">
        {streaming
          ? 'Writing the answer…'
          : answer.state === 'failed'
            ? ''
            : answer.result.kind === 'refused'
              ? 'The model declined to answer this request.'
              : answer.result.kind === 'cut-off'
                ? 'Answer ready, but it reached the length limit and stops part-way.'
                : 'Answer ready.'}
      </div>
      {answer.state === 'failed' ? (
        <Callout tone="danger" role="alert" title="The answer didn’t finish">
          {answer.message}
        </Callout>
      ) : null}
      {text ? <MarkdownView markdown={text} headingOffset={1} /> : null}
      <div className="flex flex-wrap gap-2">
        {streaming ? (
          <Button
            variant="secondary"
            icon={<Square aria-hidden="true" className="size-4" />}
            onClick={onStop}
          >
            Stop
          </Button>
        ) : text ? (
          <Button
            variant="secondary"
            icon={<Download aria-hidden="true" className="size-4" />}
            onClick={() =>
              downloadFile(
                `> Written by AI (${provider.model}) on ${todayIso()}. Check it before relying on it.\n\n${text}\n`,
                `campuskit-ai-answer-${todayIso()}.md`,
                'text/markdown',
              )
            }
          >
            Download the answer (.md)
          </Button>
        ) : null}
      </div>
    </section>
  );
}
