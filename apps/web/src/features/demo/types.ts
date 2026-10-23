/**
 * The Demo Studio's building blocks. A demo is described by plain data (its
 * features, tour, presentation steps, what it runs and what it leaves out) and
 * implemented by a module that owns its sample data and screens. The metadata
 * is checked against the real templates by `registry.test.ts`: every file and
 * function it names must exist, and every learning link must point at a real
 * walkthrough entry, architecture component, checklist item or viva question.
 */
import type { ComponentType } from 'react';

/**
 * How closely a demo follows its template.
 * - `template-logic`: re-created screens that call the template's own
 *   TypeScript modules for calculations, validation and data updates.
 * - `browser-port`: the template is not JavaScript (for example Python), so
 *   the demo re-implements its logic in TypeScript and is checked against
 *   results produced by the real code.
 */
export type DemoFidelity = 'template-logic' | 'browser-port';

/** A file in the template, optionally narrowed to where a function or constant is defined. */
export interface SourceRef {
  file: string;
  symbol?: string;
}

/** Links into the project's existing learning material, by id. */
export interface LearnRefs {
  /** Code walkthrough entry ids. */
  walkthrough?: string[];
  /** Architecture component ids. */
  architecture?: string[];
  /** Viva question ids. */
  viva?: string[];
}

export interface DemoFeature {
  id: string;
  /** The tab label. */
  label: string;
  /** What this screen shows and how it maps to the template, in two or three sentences. */
  explanation: string;
  /** Things to try, each an action the demo really supports. */
  tryThis: string[];
  /** Where this screen differs from the full project, if anywhere. */
  simplified: string[];
  source: SourceRef[];
  learn: LearnRefs;
}

export interface TourStep {
  id: string;
  feature: string;
  title: string;
  text: string;
  /** An element the demo outlines while this step is shown. */
  highlight?: string;
}

export interface PresentationStep {
  id: string;
  feature: string;
  title: string;
  /** What to explain to the teacher. */
  say: string;
  /** What to do in the demo. */
  action: string;
  /** What should happen, as the demo actually behaves. */
  expect: string;
  /** The project concept this step illustrates. */
  concept: string;
  learn?: LearnRefs;
}

export interface DemoDefinition {
  /** The catalog id of the project this demo belongs to. */
  projectId: string;
  /** The app name shown in the demo frame, as the template's configuration sets it. */
  appName: string;
  /** Shown under the app name, as in the template's default configuration. */
  appSubtitle?: string;
  fidelity: DemoFidelity;
  /** One sentence for cards and the project page. */
  summary: string;
  /** The label shown on the demo: what is re-created and what runs the real code. */
  notice: string;
  /**
   * What runs in the browser. For `template-logic` demos these are template
   * files imported as they are; for `browser-port` demos, the files whose
   * behaviour the port reproduces.
   */
  runs: { files: string[]; description: string };
  data: {
    /** Where the sample data comes from. */
    description: string;
    editable: boolean;
    /** Demo changes stay in this tab (sessionStorage) and are never mixed with other saved data. */
    persistence: 'session';
    reset: string;
  };
  features: DemoFeature[];
  tour: TourStep[];
  presentation: PresentationStep[];
  /** What the downloadable project has that the demo doesn't. */
  fullProjectAdds: string[];
  limitations: string[];
}

/** The result of checking whether a presentation step's action was done in the demo. */
export interface StepCheck {
  done: boolean;
  /** What the demo saw, e.g. "Added Kavya Rao to Class 10-A." */
  detail: string;
}

export interface DemoViewProps<State> {
  state: State;
  /** Applies a change to the demo data; the message is announced and shown as feedback. */
  update: (change: (current: State) => State, message: string) => void;
  /** Shows feedback without changing the data (for validation results, for example). */
  announce: (message: string) => void;
  feature: string;
  selectFeature: (feature: string) => void;
  /** The element to outline for the current tour step, if any. */
  highlight: string | null;
}

export interface DemoImplementation<State> {
  createState: () => State;
  /** An empty data set, for demos that show what the app looks like before any data exists. */
  createEmptyState?: () => State;
  /** Returns valid stored state, or null when the value can't be used. */
  readState: (value: unknown) => State | null;
  View: ComponentType<DemoViewProps<State>>;
  /** Checks for presentation steps whose action changes the data, by step id. */
  checks: Record<string, (state: State, start: State) => StepCheck>;
  /** A short description of the current data, e.g. "12 students · 10 school days". */
  describe: (state: State) => string;
}
