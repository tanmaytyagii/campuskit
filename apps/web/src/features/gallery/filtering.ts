/**
 * Search, filters and sorting for the project gallery. Filters live in the
 * URL (?q=react&difficulty=beginner) so every view can be shared.
 */
import {
  AUDIENCES,
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_RANK,
  PROJECT_TYPES,
  type Audience,
  type Category,
  type Difficulty,
  type ProjectManifest,
  type ProjectType,
} from '@campuskit/project-catalog';

export const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'difficulty', label: 'Difficulty (easiest first)' },
  { value: 'newest', label: 'Newest first' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['value'];

export interface GalleryFilters {
  query: string;
  audience: Audience[];
  category: Category[];
  difficulty: Difficulty[];
  language: string[];
  type: ProjectType[];
  sort: SortKey;
}

export type FacetKey = 'audience' | 'category' | 'difficulty' | 'language' | 'type';

export const EMPTY_FILTERS: GalleryFilters = {
  query: '',
  audience: [],
  category: [],
  difficulty: [],
  language: [],
  type: [],
  sort: 'name',
};

/** Styling and markup languages are not useful as a "language" filter. */
const NON_PROGRAMMING_LANGUAGES = new Set(['CSS', 'HTML']);

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return [
    ...new Set(
      values.filter((value): value is T => (allowed as readonly string[]).includes(value)),
    ),
  ];
}

export function parseFilters(
  params: URLSearchParams,
  languages: readonly string[],
): GalleryFilters {
  const sort = params.get('sort');
  return {
    query: (params.get('q') ?? '').slice(0, 100),
    audience: pick(params.getAll('audience'), AUDIENCES),
    category: pick(params.getAll('category'), CATEGORIES),
    difficulty: pick(params.getAll('difficulty'), DIFFICULTIES),
    language: pick(params.getAll('language'), languages),
    type: pick(params.getAll('type'), PROJECT_TYPES),
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? (sort as SortKey) : 'name',
  };
}

export function filtersToParams(filters: GalleryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  for (const key of ['audience', 'category', 'difficulty', 'language', 'type'] as const) {
    for (const value of filters[key]) params.append(key, value);
  }
  if (filters.sort !== 'name') params.set('sort', filters.sort);
  return params;
}

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchableText(project: ProjectManifest): string {
  return normalize(
    [
      project.name,
      project.tagline,
      project.description,
      ...project.tags.flatMap((tag) => [tag, tag.replace(/-/g, ' ')]),
      ...project.languages,
      ...project.frameworks,
    ].join(' '),
  );
}

/** Every word of the query must appear in the name, description, tags or technologies. */
export function matchesQuery(project: ProjectManifest, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchableText(project);
  return words.every((word) => haystack.includes(word));
}

function matchesFacet(
  project: ProjectManifest,
  facet: FacetKey,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) return true;
  switch (facet) {
    case 'audience':
      return project.audience.some((audience) => selected.includes(audience));
    case 'category':
      return selected.includes(project.category);
    case 'difficulty':
      return selected.includes(project.difficulty);
    case 'language':
      return project.languages.some((language) => selected.includes(language));
    case 'type':
      return selected.includes(project.projectType);
  }
}

const FACETS: FacetKey[] = ['audience', 'category', 'difficulty', 'language', 'type'];

export function filterProjects(
  projects: readonly ProjectManifest[],
  filters: GalleryFilters,
  ignore?: FacetKey,
): ProjectManifest[] {
  return projects.filter(
    (project) =>
      matchesQuery(project, filters.query) &&
      FACETS.every((facet) => facet === ignore || matchesFacet(project, facet, filters[facet])),
  );
}

export function sortProjects(
  projects: readonly ProjectManifest[],
  sort: SortKey,
): ProjectManifest[] {
  const byName = (a: ProjectManifest, b: ProjectManifest) => a.name.localeCompare(b.name, 'en');
  return [...projects].sort((a, b) => {
    if (sort === 'difficulty')
      return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || byName(a, b);
    if (sort === 'newest') return b.addedOn.localeCompare(a.addedOn) || byName(a, b);
    return byName(a, b);
  });
}

export function visibleProjects(
  projects: readonly ProjectManifest[],
  filters: GalleryFilters,
): ProjectManifest[] {
  return sortProjects(filterProjects(projects, filters), filters.sort);
}

/** Programming languages used by at least one project, for the language filter. */
export function catalogLanguages(projects: readonly ProjectManifest[]): string[] {
  return [...new Set(projects.flatMap((project) => project.languages))]
    .filter((language) => !NON_PROGRAMMING_LANGUAGES.has(language))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * How many projects each value of a facet would show, given every other
 * active filter (so the numbers next to checkboxes are always accurate).
 */
export function facetCount(
  projects: readonly ProjectManifest[],
  filters: GalleryFilters,
  facet: FacetKey,
  value: string,
): number {
  return filterProjects(projects, filters, facet).filter((project) =>
    matchesFacet(project, facet, [value]),
  ).length;
}

export function activeFilterCount(filters: GalleryFilters): number {
  return (
    FACETS.reduce((sum, facet) => sum + filters[facet].length, 0) + (filters.query.trim() ? 1 : 0)
  );
}

export interface Suggestion {
  kind: 'project' | 'topic';
  label: string;
  /** Where choosing the suggestion goes. */
  to: string;
}

/** Search suggestions: matching projects first, then matching topics and technologies. */
export function suggestions(
  projects: readonly ProjectManifest[],
  query: string,
  limit = 6,
): Suggestion[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const results: Suggestion[] = projects
    .filter((project) => matchesQuery(project, query))
    .map((project) => ({
      kind: 'project' as const,
      label: project.name,
      to: `/projects/${project.slug}`,
    }));
  const topics = new Set<string>();
  for (const project of projects) {
    for (const value of [
      ...project.tags.map((tag) => tag.replace(/-/g, ' ')),
      ...project.languages,
      ...project.frameworks,
    ]) {
      if (normalize(value).includes(needle)) topics.add(value);
    }
  }
  for (const topic of [...topics].sort((a, b) => a.localeCompare(b, 'en'))) {
    results.push({ kind: 'topic', label: topic, to: `/projects?q=${encodeURIComponent(topic)}` });
  }
  return results.slice(0, limit);
}
