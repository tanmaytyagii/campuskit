/**
 * The slides of a project presentation, built only from what CampusKit knows
 * about the project: its manifest, its learning guide (checked against the
 * template's code) and its demo. Each slide says where its content comes
 * from; the speaking notes are CampusKit's suggestions and are labelled as
 * such, never mixed into the slide itself.
 */
import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';

import type { DemoDefinition, PresentationStep } from '../demo/types.ts';

export type SlideSource = 'manifest' | 'guide' | 'demo' | 'guidance';

export const SOURCE_LABELS: Record<SlideSource, string> = {
  manifest: 'From the project’s manifest',
  guide: 'From the project’s learning guide, checked against its code',
  demo: 'Live demo with fictional sample data',
  guidance: 'Suggested by CampusKit',
};

export type SlideSection =
  | 'Introduction'
  | 'Problem'
  | 'Objectives'
  | 'Features'
  | 'Architecture'
  | 'Workflow'
  | 'Technology'
  | 'Demo'
  | 'Limitations'
  | 'Conclusion';

export type SlideBody =
  | { kind: 'title'; tagline: string; facts: string[] }
  | { kind: 'text'; paragraphs: string[]; list?: { title: string; items: string[] } }
  | { kind: 'list'; items: string[]; more?: number }
  | { kind: 'layers'; summary: string; layers: Array<{ label: string; description: string }> }
  | { kind: 'flow'; title: string; steps: Array<{ component: string; text: string }> }
  | { kind: 'facts'; groups: Array<{ title: string; items: string[] }> }
  | { kind: 'demo-plan'; steps: string[] }
  | { kind: 'demo'; step: PresentationStep; index: number; total: number }
  | { kind: 'closing'; tagline: string; improvements: string[] };

export interface Slide {
  /** Stable, used in the address (?slide=architecture). */
  id: string;
  section: SlideSection;
  title: string;
  body: SlideBody;
  source: SlideSource;
  /** Speaking notes: CampusKit's suggestions for what to say. */
  notes: string[];
}

const MAX_ITEMS = 6;

function capped(items: readonly string[]): { items: string[]; more?: number } {
  return items.length > MAX_ITEMS
    ? { items: items.slice(0, MAX_ITEMS), more: items.length - MAX_ITEMS }
    : { items: [...items] };
}

export function buildSlides(
  project: ProjectManifest,
  guide: LearningGuide | null,
  demo: DemoDefinition | undefined,
): Slide[] {
  const slides: Slide[] = [
    {
      id: 'title',
      section: 'Introduction',
      title: project.name,
      body: {
        kind: 'title',
        tagline: project.tagline,
        facts: [
          `Built with ${[...project.languages, ...project.frameworks].join(', ')}`,
          `Started from the CampusKit “${project.id}” template`,
        ],
      },
      source: 'manifest',
      notes: [
        'Introduce yourself and say in one sentence what the project does.',
        'Say that it started from a CampusKit template, and what you changed or added yourself.',
      ],
    },
    {
      id: 'problem',
      section: 'Problem',
      title: 'The problem',
      body: {
        kind: 'text',
        paragraphs: [project.description],
        ...(guide ? { list: { title: 'Who it is for', items: [guide.audience.summary] } } : {}),
      },
      source: 'manifest',
      notes: [
        'Describe who has this problem and what they do today without the app.',
        'Keep it to the problem; the features come next.',
      ],
    },
    {
      id: 'objectives',
      section: 'Objectives',
      title: 'Learning objectives',
      body: { kind: 'list', ...capped(project.learningObjectives) },
      source: 'manifest',
      notes: [
        'Explain what building this project taught you, with one example from the code.',
        'Pick the objectives you can talk about confidently.',
      ],
    },
    {
      id: 'features',
      section: 'Features',
      title: 'Key features',
      body: { kind: 'list', ...capped(project.features) },
      source: 'manifest',
      notes: [
        'Mention the features you will show in the demo, so the panel knows what to expect.',
        'Only claim what the project really does; the limitations come later.',
      ],
    },
  ];

  if (guide) {
    slides.push({
      id: 'architecture',
      section: 'Architecture',
      title: 'Architecture',
      body: {
        kind: 'layers',
        summary: guide.architecture.summary,
        layers: guide.architecture.layers.map((layer) => ({
          label: layer.label,
          description: layer.description,
        })),
      },
      source: 'guide',
      notes: [
        'Walk through the layers from the screen down to where the data is kept.',
        'Name one file in each layer if you can; the learning studio’s architecture explorer lists them.',
      ],
    });
    const [flow, ...otherFlows] = guide.architecture.flows;
    if (flow) {
      const names = new Map(
        guide.architecture.components.map((component) => [component.id, component.name]),
      );
      slides.push({
        id: 'workflow',
        section: 'Workflow',
        title: 'How it works',
        body: {
          kind: 'flow',
          title: flow.title,
          steps: flow.steps.map((step) => ({
            component: names.get(step.component) ?? step.component,
            text: step.text,
          })),
        },
        source: 'guide',
        notes: [
          'Follow one action from start to finish; this is the question examiners ask most often.',
          ...(otherFlows.length > 0
            ? [
                `The learning guide also describes: ${otherFlows.map((item) => item.title).join('; ')}.`,
              ]
            : []),
        ],
      });
    }
  }

  slides.push({
    id: 'technology',
    section: 'Technology',
    title: 'Built with',
    body: {
      kind: 'facts',
      groups: [
        { title: 'Languages and frameworks', items: [...project.languages, ...project.frameworks] },
        { title: 'How it runs', items: [project.stack.summary] },
        {
          title: `Tested with ${project.testing.tools.join(', ')}`,
          items: project.testing.covers.slice(0, 4),
        },
      ],
    },
    source: 'manifest',
    notes: [
      'Give one reason for each main technology choice.',
      'Say how you ran the tests, and only describe test results you have seen yourself.',
    ],
  });

  if (guide) {
    slides.push({
      id: 'demo-plan',
      section: 'Demo',
      title: 'Demo plan',
      body: { kind: 'demo-plan', steps: guide.demo },
      source: 'guide',
      notes: [
        'If you are showing your own running copy, follow these steps.',
        demo
          ? 'If not, the next slides show the browser demo with fictional data; say that it is a demonstration.'
          : 'Have your own copy running before the presentation starts.',
      ],
    });
  }

  if (demo) {
    demo.presentation.forEach((step, index) => {
      slides.push({
        id: `demo-${step.id}`,
        section: 'Demo',
        title: step.title,
        body: { kind: 'demo', step, index, total: demo.presentation.length },
        source: 'demo',
        notes: [`Say: ${step.say}`, `Do: ${step.action}`, `Expect: ${step.expect}`],
      });
    });
  }

  slides.push(
    {
      id: 'limitations',
      section: 'Limitations',
      title: 'Limitations',
      body: { kind: 'list', ...capped(project.limitations) },
      source: 'manifest',
      notes: [
        'Being clear about limitations shows you understand the project.',
        'For each one, say how you would remove it with more time.',
      ],
    },
    {
      id: 'conclusion',
      section: 'Conclusion',
      title: 'Conclusion',
      body: {
        kind: 'closing',
        tagline: project.tagline,
        improvements: project.ideasForExtension.slice(0, 4),
      },
      source: 'manifest',
      notes: [
        'Summarise the project in two sentences, then thank the panel and invite questions.',
        'Viva practice has this project’s likely questions with model answers.',
      ],
    },
  );
  return slides;
}
