import type {
  ArchitectureComponent,
  LearningGuide,
  ProjectManifest,
} from '@campuskit/project-catalog';
import { ArrowRight, FileCode } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { cn } from '../../lib/cn.ts';
import { fileHref, sourceHref } from './links.ts';

const KIND_LABELS: Record<ArchitectureComponent['kind'], string> = {
  configuration: 'Configuration',
  interface: 'User interface',
  state: 'State',
  logic: 'Logic',
  storage: 'Storage',
  server: 'Server',
  data: 'Data',
  external: 'External service',
  tests: 'Tests',
};

/**
 * The architecture from the learning guide: layers of components that can be
 * selected for details, their connections and step-by-step data flows. The
 * validator checks every file and function named here exists in the template.
 */
export function ArchitectureSection({
  project,
  guide,
}: {
  project: ProjectManifest;
  guide: LearningGuide;
}) {
  const { architecture } = guide;
  const [params] = useSearchParams();
  // Links from other pages (the demo studio, for example) can open a component: ?component=storage.
  const [selectedId, setSelectedId] = useState(() => {
    const requested = params.get('component');
    return architecture.components.some((component) => component.id === requested)
      ? (requested ?? '')
      : (architecture.components[0]?.id ?? '');
  });
  const selected =
    architecture.components.find((component) => component.id === selectedId) ??
    architecture.components[0];
  const nameOf = (id: string) =>
    architecture.components.find((component) => component.id === id)?.name ?? id;
  const architectureDoc = project.docs.find((doc) => doc.kind === 'architecture');

  return (
    <div className="space-y-10">
      <p className="max-w-[75ch] text-ink-2">{architecture.summary}</p>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-base font-bold text-ink">Layers and components</h3>
          <p className="mt-1 text-sm text-ink-3">Choose a component to see what it does.</p>
          <ol
            className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
            aria-label="Architecture layers"
          >
            {architecture.layers.map((layer) => (
              <li
                key={layer.id}
                className="grid gap-3 p-4 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-5"
              >
                <div>
                  <p className="font-semibold text-ink">{layer.label}</p>
                  <p className="type-meta mt-0.5">{layer.description}</p>
                </div>
                <ul className="flex flex-wrap gap-2" aria-label={`${layer.label} components`}>
                  {architecture.components
                    .filter((component) => component.layer === layer.id)
                    .map((component) => (
                      <li key={component.id}>
                        <button
                          type="button"
                          aria-pressed={component.id === selected?.id}
                          onClick={() => setSelectedId(component.id)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                            component.id === selected?.id
                              ? 'border-violet bg-violet-soft text-violet'
                              : 'border-line-strong bg-canvas text-ink hover:border-ink-3',
                          )}
                        >
                          {component.name}
                        </button>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {selected ? (
          <div className="space-y-4 self-start rounded-xl border border-line bg-raised p-5 xl:sticky xl:top-24">
            <p role="status" className="sr-only">
              Showing {selected.name}
            </p>
            <div>
              <p className="text-xs font-semibold text-ink-3">
                {KIND_LABELS[selected.kind]} ·{' '}
                {architecture.layers.find((layer) => layer.id === selected.layer)?.label}
              </p>
              <h3 className="type-h3 text-ink">{selected.name}</h3>
            </div>
            <p className="text-ink-2">{selected.responsibility}</p>
            <div>
              <h4 className="text-sm font-bold text-ink">Files</h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {selected.files.map((file) => (
                  <li key={file}>
                    <Link
                      to={fileHref(project, file)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 font-mono text-xs text-ink hover:text-violet"
                    >
                      <FileCode aria-hidden="true" className="size-3.5" />
                      {file}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {selected.symbols.length > 0 ? (
              <div>
                <h4 className="text-sm font-bold text-ink">Key code</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {selected.symbols.map((symbol) => (
                    <li key={`${symbol.file}#${symbol.name}`}>
                      <Link to={sourceHref(project, symbol.file, symbol.name)} className="link">
                        <code className="font-mono">{symbol.name}</code>
                      </Link>{' '}
                      <span className="text-ink-3">in {symbol.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ConnectionList
              title="Uses"
              items={architecture.connections
                .filter((connection) => connection.from === selected.id)
                .map((connection) => ({ id: connection.to, label: connection.label }))}
              nameOf={nameOf}
              onSelect={setSelectedId}
            />
            <ConnectionList
              title="Used by"
              items={architecture.connections
                .filter((connection) => connection.to === selected.id)
                .map((connection) => ({ id: connection.from, label: connection.label }))}
              nameOf={nameOf}
              onSelect={setSelectedId}
            />
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">How data flows</h3>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {architecture.flows.map((flow) => (
            <section
              key={flow.id}
              aria-labelledby={`flow-${flow.id}`}
              className="rounded-xl border border-line bg-surface p-5"
            >
              <h4 id={`flow-${flow.id}`} className="font-semibold text-ink">
                {flow.title}
              </h4>
              <ol className="mt-3 space-y-3">
                {flow.steps.map((step, index) => (
                  <li key={index} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className="flex size-6 items-center justify-center rounded-full bg-violet-soft text-xs font-bold text-violet"
                    >
                      {index + 1}
                    </span>
                    <span className="text-ink-2">
                      <span className="font-semibold text-ink">{nameOf(step.component)}: </span>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">All connections</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {architecture.connections.map((connection) => (
            <li
              key={`${connection.from}-${connection.to}`}
              className="flex flex-wrap items-baseline gap-x-1.5 rounded-lg bg-raised px-3 py-2"
            >
              <span className="font-semibold text-ink">{nameOf(connection.from)}</span>
              <ArrowRight aria-hidden="true" className="size-3.5 self-center text-ink-3" />
              <span className="sr-only">to</span>
              <span className="font-semibold text-ink">{nameOf(connection.to)}</span>
              <span className="text-ink-3">: {connection.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {architectureDoc ? (
        <p className="text-sm text-ink-3">
          The project also ships its own architecture notes, with a data model and a suggested
          database design:{' '}
          <Link to={`/projects/${project.slug}/docs/architecture`} className="link">
            read {architectureDoc.file}
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function ConnectionList({
  title,
  items,
  nameOf,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  nameOf: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={`${item.id}-${item.label}`}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="font-semibold text-violet hover:underline"
            >
              {nameOf(item.id)}
            </button>{' '}
            <span className="text-ink-3">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
