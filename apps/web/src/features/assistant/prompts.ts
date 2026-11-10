/**
 * What the assistant sends for each task: a system prompt and the student's material, built from
 * CampusKit's own data (a template's learning guide, a project from the workspace) or from text
 * the student pastes. The student sees exactly this text before anything is sent. Every prompt
 * asks Claude to work only from the material given and to say when something isn't in it.
 */
import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';

import { STATUS_LABELS, type WorkspaceProject } from '../../lib/workspace.ts';

export const TASKS = {
  architecture: 'Explain a template’s architecture',
  code: 'Explain a piece of code',
  viva: 'Write practice viva questions',
  error: 'Explain an error message',
  roadmap: 'Plan what to learn for my project',
  docs: 'Suggest improvements to documentation',
} as const;
export type TaskId = keyof typeof TASKS;

/** Pasted text is limited, so a request stays small and quick to review. */
export const MAX_PASTE = 12_000;

export interface AssistantRequest {
  task: TaskId;
  system: string;
  user: string;
}

const BASE = [
  'You help a student understand and present their own software project.',
  'Work only from the material in the message. If something needed isn’t there, say so plainly instead of guessing.',
  'Never invent features, results, test outcomes, numbers or citations.',
  'Write in clear, plain English for a student. Use short sections and lists where they help.',
].join(' ');

function system(task: string): string {
  return `${BASE}\n\n${task}`;
}

/** A template described from its learning guide: summary, layers, components and data flows. */
export function templateMaterial(project: ProjectManifest, guide: LearningGuide): string {
  const { architecture } = guide;
  const frameworks = project.frameworks.length ? `; ${project.frameworks.join(', ')}` : '';
  return [
    `Project: ${project.name} (${project.languages.join(', ')}${frameworks})`,
    '',
    `Summary: ${architecture.summary}`,
    '',
    'Layers:',
    ...architecture.layers.map((layer) => `- ${layer.label}: ${layer.description}`),
    '',
    'Components:',
    ...architecture.components.map(
      (component) =>
        `- ${component.name} (${component.layer}; files: ${component.files.join(', ')}): ${component.responsibility}`,
    ),
    '',
    'Data flows:',
    ...architecture.flows.flatMap((flow) => [
      `- ${flow.title}:`,
      ...flow.steps.map((step, index) => `  ${index + 1}. [${step.component}] ${step.text}`),
    ]),
  ].join('\n');
}

export function architectureRequest(material: string): AssistantRequest {
  return {
    task: 'architecture',
    system: system(
      'Explain this project’s architecture so the student could describe it in a viva: what each layer is for, how a request or action moves through the components, and why it is organised this way. End with three questions an examiner might ask about the architecture.',
    ),
    user: material,
  };
}

export function codeRequest(code: string, context: string): AssistantRequest {
  return {
    task: 'code',
    system: system(
      'Explain what the code does, step by step, then the important ideas it uses, and anything that could go wrong. Quote the lines you refer to. Don’t rewrite the code unless a line is clearly wrong; if it is, say why.',
    ),
    user: `${context.trim() ? `Context: ${context.trim()}\n\n` : ''}Code:\n\`\`\`\n${code.slice(0, MAX_PASTE)}\n\`\`\``,
  };
}

export function workspaceDescription(project: WorkspaceProject): string {
  return [
    `Project: ${project.title}`,
    project.description ? `Description: ${project.description}` : '',
    `Status: ${STATUS_LABELS[project.status]}`,
    project.stack.length ? `Technology: ${project.stack.join(', ')}` : '',
    project.milestones.length
      ? `Milestones: ${project.milestones.map((item) => `${item.title}${item.done ? ' (done)' : ''}`).join('; ')}`
      : '',
    project.notes.trim() ? `Notes:\n${project.notes.trim().slice(0, 4000)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function vivaRequest(material: string, count: number): AssistantRequest {
  return {
    task: 'viva',
    system: system(
      `Write ${count} viva questions an examiner could ask about this project, from basic to hard, each with a short model answer drawn only from the material. Where the material can’t answer a question, write “Answer from your own code:” and say what to look for instead of inventing an answer.`,
    ),
    user: material,
  };
}

export function errorRequest(log: string, context: string): AssistantRequest {
  return {
    task: 'error',
    system: system(
      'Explain what this error means, the most likely causes in order, and the steps to check or fix each one. If the log is cut off or doesn’t show the cause, say what extra output would help.',
    ),
    user: `${context.trim() ? `About the project: ${context.trim()}\n\n` : ''}Error output:\n\`\`\`\n${log.slice(0, MAX_PASTE)}\n\`\`\``,
  };
}

export function roadmapRequest(material: string): AssistantRequest {
  return {
    task: 'roadmap',
    system: system(
      'Plan what the student should learn to finish and explain this project, in an order that builds up: for each step, what to learn, why this project needs it, and a small exercise to check understanding. Keep it to what the project actually uses.',
    ),
    user: material,
  };
}

export function docsRequest(text: string): AssistantRequest {
  return {
    task: 'docs',
    system: system(
      'Review this documentation and suggest improvements: missing sections, unclear steps, claims that need evidence, and wording. Point to the exact sentences. Don’t add claims about the project that the text doesn’t support.',
    ),
    user: `Documentation:\n\n${text.slice(0, MAX_PASTE)}`,
  };
}
