import { catalog } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  catalogLanguages,
  EMPTY_FILTERS,
  facetCount,
  filterProjects,
  filtersToParams,
  matchesQuery,
  parseFilters,
  sortProjects,
  suggestions,
  visibleProjects,
} from './filtering.ts';

const languages = catalogLanguages(catalog);
const ids = (projects: readonly { id: string }[]) => projects.map((project) => project.id);

describe('gallery filtering', () => {
  it('derives the language filter from the catalog, leaving out CSS', () => {
    expect(languages).toEqual(['Python', 'TypeScript']);
  });

  it('parses URL parameters and ignores unknown values', () => {
    const params = new URLSearchParams(
      'q=react&difficulty=beginner&difficulty=impossible&language=Python&language=Cobol&sort=newest&audience=school',
    );
    expect(parseFilters(params, languages)).toEqual({
      query: 'react',
      audience: ['school'],
      category: [],
      difficulty: ['beginner'],
      language: ['Python'],
      type: [],
      sort: 'newest',
    });
  });

  it('round-trips filters through the URL and omits defaults', () => {
    const filters = {
      ...EMPTY_FILTERS,
      query: 'charts',
      category: ['web-development' as const],
      sort: 'difficulty' as const,
    };
    const params = filtersToParams(filters);
    expect(params.toString()).toBe('q=charts&category=web-development&sort=difficulty');
    expect(parseFilters(params, languages)).toEqual(filters);
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe('');
  });

  it('searches names, descriptions, tags and technologies, ignoring case and accents', () => {
    const analyzer = catalog.find((project) => project.id === 'student-result-analyzer');
    if (!analyzer) throw new Error('missing project');
    expect(matchesQuery(analyzer, 'PANDAS')).toBe(true);
    expect(matchesQuery(analyzer, 'data validation')).toBe(true);
    expect(matchesQuery(analyzer, 'pándas')).toBe(true);
    expect(matchesQuery(analyzer, 'react')).toBe(false);
    expect(ids(filterProjects(catalog, { ...EMPTY_FILTERS, query: 'react typescript' }))).toEqual([
      'attendance-system',
      'expense-tracker',
    ]);
  });

  it('combines filters: OR within a group, AND across groups', () => {
    expect(
      ids(filterProjects(catalog, { ...EMPTY_FILTERS, difficulty: ['beginner', 'intermediate'] })),
    ).toHaveLength(3);
    expect(
      ids(
        filterProjects(catalog, {
          ...EMPTY_FILTERS,
          difficulty: ['intermediate'],
          language: ['TypeScript'],
        }),
      ),
    ).toEqual(['expense-tracker']);
    expect(filterProjects(catalog, { ...EMPTY_FILTERS, category: ['ai-ml'] })).toEqual([]);
  });

  it('sorts by name, difficulty and date', () => {
    expect(ids(sortProjects(catalog, 'name'))).toEqual([
      'expense-tracker',
      'attendance-system',
      'student-result-analyzer',
    ]);
    expect(ids(sortProjects(catalog, 'difficulty'))[0]).toBe('attendance-system');
    expect(ids(visibleProjects(catalog, { ...EMPTY_FILTERS, sort: 'newest' }))).toHaveLength(3);
  });

  it('counts results for each filter value given the other filters', () => {
    const filters = { ...EMPTY_FILTERS, language: ['TypeScript'] };
    expect(facetCount(catalog, filters, 'difficulty', 'beginner')).toBe(1);
    expect(facetCount(catalog, filters, 'difficulty', 'intermediate')).toBe(1);
    // The language facet ignores its own selection, so other languages still show their counts.
    expect(facetCount(catalog, filters, 'language', 'Python')).toBe(1);
    expect(activeFilterCount({ ...filters, query: 'x' })).toBe(2);
  });

  it('suggests projects first, then topics', () => {
    const results = suggestions(catalog, 'chart');
    expect(results[0]).toEqual({
      kind: 'project',
      label: 'Personal Expense Tracker',
      to: '/projects/expense-tracker',
    });
    expect(results.some((item) => item.kind === 'topic' && item.label === 'charts')).toBe(true);
    expect(suggestions(catalog, '   ')).toEqual([]);
  });
});
