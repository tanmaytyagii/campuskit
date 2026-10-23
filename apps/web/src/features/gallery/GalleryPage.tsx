import { catalog } from '@campuskit/project-catalog';
import { Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { ProjectCard } from '../../components/ProjectCard.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { controlClasses } from '../../components/ui/Field.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cn } from '../../lib/cn.ts';
import { ChooseGuide } from './ChooseGuide.tsx';
import { ActiveFilters, facetDefinitions, FilterPanel } from './FilterPanel.tsx';
import {
  activeFilterCount,
  catalogLanguages,
  EMPTY_FILTERS,
  filtersToParams,
  parseFilters,
  SORT_OPTIONS,
  visibleProjects,
  type FacetKey,
  type GalleryFilters,
  type SortKey,
} from './filtering.ts';

const LANGUAGES = catalogLanguages(catalog);
const FACETS = facetDefinitions(LANGUAGES);

export function GalleryPage() {
  useDocumentTitle('Projects');
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params, LANGUAGES), [params]);
  const results = useMemo(() => visibleProjects(catalog, filters), [filters]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchId = useId();
  const sortId = useId();
  const activeCount = activeFilterCount(filters);

  // Filters live in the address. React Router normally applies navigations in a transition;
  // flushSync applies them at once, so checkboxes and the sort menu update immediately.
  function apply(next: GalleryFilters, replace = false) {
    setParams(filtersToParams(next), { replace, flushSync: true });
  }

  // The search box keeps its own text: the address stores the query trimmed, and binding the box
  // to it directly would swallow the space between two words and move the caret while typing.
  // When the address changes for another reason (Back button, reset, a link), the box follows it.
  const [searchText, setSearchText] = useState(filters.query);
  const [addressQuery, setAddressQuery] = useState(filters.query);
  if (filters.query !== addressQuery) {
    setAddressQuery(filters.query);
    if (filters.query !== searchText.trim()) setSearchText(filters.query);
  }

  function search(text: string) {
    setSearchText(text);
    apply({ ...filters, query: text }, true);
  }

  function toggle(facet: FacetKey, value: string) {
    const current = filters[facet] as string[];
    const nextValues = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    apply({ ...filters, [facet]: nextValues });
  }

  function remove(facet: FacetKey | 'query', value: string) {
    if (facet === 'query') apply({ ...filters, query: '' });
    else
      apply({ ...filters, [facet]: (filters[facet] as string[]).filter((item) => item !== value) });
  }

  const reset = () => apply({ ...EMPTY_FILTERS, sort: filters.sort });

  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Projects"
        description="Complete, tested starter projects. Each one runs on your own computer and comes with setup steps, documentation and viva questions."
      />
      <div className="container-page grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-line bg-surface p-5">
            <FilterPanel
              projects={catalog}
              filters={filters}
              facets={FACETS}
              onToggle={toggle}
              idPrefix="sidebar"
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor={searchId} className="text-sm font-semibold text-ink">
                Search
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3"
                />
                <input
                  id={searchId}
                  type="search"
                  placeholder="Name, topic, language or framework"
                  value={searchText}
                  maxLength={100}
                  onChange={(event) => search(event.target.value)}
                  className={cn(controlClasses, 'h-11 pl-10')}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:w-60">
              <label htmlFor={sortId} className="text-sm font-semibold text-ink">
                Sort by
              </label>
              <select
                id={sortId}
                value={filters.sort}
                onChange={(event) => apply({ ...filters, sort: event.target.value as SortKey })}
                className={cn(controlClasses, 'h-11')}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              className="lg:hidden"
              size="lg"
              onClick={() => setFiltersOpen(true)}
              icon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </div>

          <ChooseGuide projects={catalog} />

          <ActiveFilters filters={filters} facets={FACETS} onRemove={remove} onReset={reset} />

          <p className="text-sm text-ink-3" role="status" aria-live="polite">
            {results.length === catalog.length
              ? `${catalog.length} ${catalog.length === 1 ? 'project' : 'projects'}`
              : `Showing ${results.length} of ${catalog.length} projects`}
          </p>

          {results.length === 0 ? (
            <EmptyState
              icon={<SearchX aria-hidden="true" className="size-6" />}
              title="No projects match these filters"
              actions={
                <>
                  <Button onClick={reset}>Reset filters</Button>
                  <Link
                    to="/docs/adding-a-template"
                    className={cn(
                      'inline-flex h-10 items-center rounded-lg px-4 font-semibold text-violet hover:underline',
                    )}
                  >
                    Propose a project
                  </Link>
                </>
              }
            >
              Try fewer filters or a broader search. If the project you need doesn’t exist yet, you
              can propose or contribute it.
            </EmptyState>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {results.map((project) => (
                <li key={project.id} className="flex">
                  <ProjectCard project={project} headingLevel="h2" className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter projects"
        variant="sheet"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              Show {results.length} {results.length === 1 ? 'project' : 'projects'}
            </Button>
          </div>
        }
      >
        <FilterPanel
          projects={catalog}
          filters={filters}
          facets={FACETS}
          onToggle={toggle}
          idPrefix="dialog"
        />
      </Dialog>
    </>
  );
}
