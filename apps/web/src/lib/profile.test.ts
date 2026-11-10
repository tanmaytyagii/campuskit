import { catalog } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_PROFILE,
  isProfile,
  PROFILE_KEY,
  profileStore,
  recommendTemplates,
} from './profile.ts';

const names = (profile: typeof EMPTY_PROFILE) =>
  recommendTemplates(profile).map((item) => item.project.name);

describe('the profile', () => {
  it('suggests templates matching the student’s interests, with the reasons', () => {
    const python = recommendTemplates({ ...EMPTY_PROFILE, interests: ['python'] });
    expect(python.map((item) => item.project.name).sort()).toEqual([
      'Student Management System',
      'Student Result Analyzer',
    ]);
    expect(python[0]?.reasons).toEqual(['Matches your interest: Python']);
    // Two matching interests rank a template higher.
    expect(names({ ...EMPTY_PROFILE, interests: ['python', 'databases'] })[0]).toBe(
      'Student Management System',
    );
  });

  it('counts a difficulty that suits the level', () => {
    const school = recommendTemplates({ ...EMPTY_PROFILE, level: 'school', interests: ['web'] });
    expect(school[0]?.project.difficulty).toBe('beginner');
    expect(school[0]?.reasons).toContain('Its difficulty (beginner) suits your level');
  });

  it('offers every template, easiest first, when no interest is chosen', () => {
    const all = recommendTemplates(EMPTY_PROFILE);
    expect(all).toHaveLength(catalog.length);
    expect(all[0]?.project.difficulty).toBe('beginner');
  });

  it('accepts only well-formed profiles', () => {
    expect(isProfile(EMPTY_PROFILE)).toBe(true);
    expect(isProfile({ ...EMPTY_PROFILE, level: 'phd' })).toBe(false);
    expect(isProfile({ ...EMPTY_PROFILE, interests: ['cooking'] })).toBe(false);
    expect(isProfile({ ...EMPTY_PROFILE, name: 'x'.repeat(61) })).toBe(false);
  });

  it('saves a tidy profile and ignores an unreadable one', () => {
    profileStore.update((profile) => ({ ...profile, name: '  Asha  ', interests: ['web', 'web'] }));
    expect(JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? '{}')).toMatchObject({
      name: 'Asha',
      interests: ['web'],
    });
    window.localStorage.setItem(PROFILE_KEY, '{"version": 1, "name": 5}');
    profileStore.reload();
    expect(profileStore.getSnapshot()).toEqual(EMPTY_PROFILE);
  });
});
