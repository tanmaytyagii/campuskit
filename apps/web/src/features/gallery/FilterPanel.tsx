import {
  AUDIENCE_LABELS,
  AUDIENCES,
  CATEGORIES,
  CATEGORY_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn.ts';
import { facetCount, type FacetKey, type GalleryFilters } from './filtering.ts';

export interface FacetDefinition {
  key: FacetKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function facetDefinitions(languages: string[]): FacetDefinition[] {
  return [
    {
      key: 'audience',
      label: 'Audience',
      options: AUDIENCES.map((value) => ({ value, label: AUDIENCE_LABELS[value] })),
    },
    {
      key: 'category',
      label: 'Category',
      options: CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      options: DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
    },
    {
      key: 'language',
      label: 'Language',
      options: languages.map((value) => ({ value, label: value })),
    },
    {
      key: 'type',
      label: 'Project type',
      options: PROJECT_TYPES.map((value) => ({ value, label: PROJECT_TYPE_LABELS[value] })),
    },
  ];
}

interface FilterPanelProps {
  projects: readonly ProjectManifest[];
  filters: GalleryFilters;
  facets: FacetDefinition[];
  onToggle: (facet: FacetKey, value: string) => void;
  idPrefix: string;
}

export function FilterPanel({ projects, filters, facets, onToggle, idPrefix }: FilterPanelProps) {
  return (
    <div className="divide-y divide-line">
      {facets.map((facet) => {
        // Hide project types nobody has published yet, to keep the list short.
        const options =
          facet.key === 'type'
            ? facet.options.filter((option) =>
                projects.some((project) => project.projectType === option.value),
              )
            : facet.options;
        return (
          <fieldset key={facet.key} className="py-4 first:pt-0 last:pb-0">
            <legend className="type-eyebrow mb-2 float-left w-full">{facet.label}</legend>
            <ul className="clear-both space-y-0.5">
              {options.map((option) => {
                const id = `${idPrefix}-${facet.key}-${option.value}`;
                const checked = (filters[facet.key] as string[]).includes(option.value);
                const count = facetCount(projects, filters, facet.key, option.value);
                return (
                  <li key={option.value}>
                    <label
                      htmlFor={id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-raised',
                        checked
                          ? 'font-medium text-ink'
                          : count === 0
                            ? 'text-ink-3'
                            : 'text-ink-2',
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(facet.key, option.value)}
                        className="size-4"
                      />
                      <span className="flex-1">{option.label}</span>
                      <span className="font-mono text-xs text-ink-3" aria-hidden="true">
                        {count}
                      </span>
                      <span className="sr-only">
                        , {count} {count === 1 ? 'project' : 'projects'}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}

interface ActiveFiltersProps {
  filters: GalleryFilters;
  facets: FacetDefinition[];
  onRemove: (facet: FacetKey | 'query', value: string) => void;
  onReset: () => void;
}

/** The filters currently applied, each removable, plus a reset button. */
export function ActiveFilters({ filters, facets, onRemove, onReset }: ActiveFiltersProps) {
  const chips: Array<{ facet: FacetKey | 'query'; value: string; label: string }> = [];
  if (filters.query.trim())
    chips.push({ facet: 'query', value: filters.query, label: `“${filters.query.trim()}”` });
  for (const facet of facets) {
    for (const value of filters[facet.key] as string[]) {
      chips.push({
        facet: facet.key,
        value,
        label: `${facet.label}: ${facet.options.find((option) => option.value === value)?.label ?? value}`,
      });
    }
  }
  if (chips.length === 0) return null;
  return (
    <div role="group" className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={`${chip.facet}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.facet, chip.value)}
          className="inline-flex items-center gap-1.5 rounded-md border border-violet/40 bg-violet-soft px-2.5 py-1 text-sm font-medium text-violet hover:border-violet"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="ml-1 text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        Reset filters
      </button>
    </div>
  );
}
