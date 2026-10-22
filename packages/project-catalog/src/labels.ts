/** Human-readable labels for manifest values, shared by every screen. */
import type { Audience, Category, Difficulty, ProjectType } from './schema.ts';

export const CATEGORY_LABELS: Record<Category, string> = {
  'web-development': 'Web development',
  'data-analysis': 'Data analysis',
  'ai-ml': 'AI / ML',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  'web-app': 'Web app',
  'data-app': 'Data app',
  'command-line': 'Command-line tool',
  notebook: 'Notebook',
  api: 'API',
  game: 'Game',
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  school: 'School',
  college: 'College',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Sort order for difficulty (beginner first). */
export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
