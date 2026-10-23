/**
 * Learning guides: the architecture, code walkthrough, checklist, viva
 * questions, demonstration steps and troubleshooting shown in a project's
 * Learning Studio (learning/<template-id>.json).
 *
 * Guides are written by people, so `pnpm validate:catalog` checks them
 * against the real template: every file they mention must be in the
 * template, every function or constant they mention must be defined in that
 * file, every component and question id must be unique, and no command may
 * delete files or change system settings. A guide can't describe code that
 * isn't there.
 */
import { isSafeRelativePath } from '@campuskit/template-engine';

import { z } from './zod.ts';

const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');
const text = (max: number) => z.string().trim().min(3).max(max);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format');
const filePath = z
  .string()
  .refine(isSafeRelativePath, 'Must be a safe relative path inside the template');
/** A function, class, type, constant or configuration key. */
const symbolName = z
  .string()
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, 'Use the name exactly as it appears in the code');

export const symbolRefSchema = z.strictObject({ file: filePath, name: symbolName });

export const COMPONENT_KINDS = [
  'configuration',
  'interface',
  'state',
  'logic',
  'storage',
  'server',
  'data',
  'external',
  'tests',
] as const;

export const architectureSchema = z.strictObject({
  summary: text(600),
  layers: z
    .array(z.strictObject({ id, label: text(40), description: text(240) }))
    .min(2)
    .max(8),
  components: z
    .array(
      z.strictObject({
        id,
        name: text(60),
        layer: id,
        kind: z.enum(COMPONENT_KINDS),
        responsibility: text(400),
        files: z.array(filePath).min(1).max(12),
        symbols: z.array(symbolRefSchema).max(8),
      }),
    )
    .min(2)
    .max(24),
  connections: z
    .array(z.strictObject({ from: id, to: id, label: text(120) }))
    .min(1)
    .max(40),
  flows: z
    .array(
      z.strictObject({
        id,
        title: text(80),
        steps: z
          .array(z.strictObject({ component: id, text: text(300) }))
          .min(2)
          .max(10),
      }),
    )
    .min(1)
    .max(8),
});

export const walkthroughEntrySchema = z.strictObject({
  id,
  title: text(80),
  file: filePath,
  /** One line: what this file is for. */
  role: text(200),
  explanation: text(1200),
  symbols: z.array(z.strictObject({ name: symbolName, explanation: text(400) })).max(8),
  related: z.array(filePath).max(6),
  tests: z.array(filePath).max(4),
});

export const CHECKLIST_AREAS = [
  'setup',
  'architecture',
  'functionality',
  'data',
  'validation',
  'testing',
  'limitations',
  'improvements',
] as const;
export type ChecklistArea = (typeof CHECKLIST_AREAS)[number];

export const CHECKLIST_AREA_LABELS: Record<ChecklistArea, string> = {
  setup: 'Setup',
  architecture: 'Architecture',
  functionality: 'Main functionality',
  data: 'Data handling',
  validation: 'Validation and errors',
  testing: 'Testing',
  limitations: 'Limitations',
  improvements: 'Possible improvements',
};

export const checklistItemSchema = z.strictObject({
  id,
  area: z.enum(CHECKLIST_AREAS),
  text: text(240),
  /** How the student can check it, e.g. "Explain it to a friend using …". */
  how: text(300).optional(),
  file: filePath.optional(),
});

export const VIVA_CATEGORIES = [
  'basics',
  'technology',
  'architecture',
  'implementation',
  'data-structures',
  'testing',
  'security',
  'limitations',
  'improvements',
] as const;
export type VivaCategory = (typeof VIVA_CATEGORIES)[number];

export const VIVA_CATEGORY_LABELS: Record<VivaCategory, string> = {
  basics: 'Basic concepts',
  technology: 'Technology choices',
  architecture: 'Architecture',
  implementation: 'Code implementation',
  'data-structures': 'Data structures and algorithms',
  testing: 'Testing',
  security: 'Security and privacy',
  limitations: 'Limitations',
  improvements: 'Future improvements',
};

export const VIVA_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type VivaDifficulty = (typeof VIVA_DIFFICULTIES)[number];

export const VIVA_DIFFICULTY_LABELS: Record<VivaDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const vivaQuestionSchema = z.strictObject({
  id,
  category: z.enum(VIVA_CATEGORIES),
  difficulty: z.enum(VIVA_DIFFICULTIES),
  question: text(240),
  /** The short answer a student should be able to give. */
  answer: text(700),
  /** More detail, for students who want to understand the why. */
  explanation: text(1500).optional(),
  /**
   * Ideas a good answer mentions. Each concept counts as mentioned when any of
   * its terms appears in the student's answer: a transparent checklist, not a
   * judgement of whether the answer is right.
   */
  keyConcepts: z
    .array(
      z.strictObject({
        label: text(80),
        terms: z.array(z.string().trim().min(2).max(40)).min(1).max(8),
      }),
    )
    .min(2)
    .max(6),
  files: z.array(filePath).max(4),
  symbols: z.array(symbolRefSchema).max(4),
});

export const TROUBLESHOOTING_STAGES = ['install', 'run', 'data', 'build', 'test'] as const;
export type TroubleshootingStage = (typeof TROUBLESHOOTING_STAGES)[number];

export const TROUBLESHOOTING_STAGE_LABELS: Record<TroubleshootingStage, string> = {
  install: 'Installing',
  run: 'Running the app',
  data: 'Data and files',
  build: 'Building',
  test: 'Testing',
};

export const TROUBLESHOOTING_PLATFORMS = ['windows', 'macos', 'linux'] as const;

const commandSchema = z.strictObject({
  command: z.string().trim().min(1).max(200),
  platform: z.enum(['all', 'windows', 'macos-linux']),
});

const troubleshootingStepSchema = z.strictObject({
  text: text(400),
  commands: z.array(commandSchema).max(4),
});

export const troubleshootingEntrySchema = z.strictObject({
  id,
  stage: z.enum(TROUBLESHOOTING_STAGES),
  /** The symptom as a student would describe it or see it. */
  title: text(120),
  symptom: text(400),
  causes: z.array(text(300)).min(1).max(6),
  diagnose: z.array(troubleshootingStepSchema).min(1).max(6),
  fix: z.array(troubleshootingStepSchema).min(1).max(6),
  confirm: text(300),
  platforms: z.array(z.enum(TROUBLESHOOTING_PLATFORMS)).max(3),
  /**
   * Present only when the problem was actually seen while verifying the
   * template. Everything else is general advice for the project's stack.
   */
  observed: z
    .strictObject({
      on: isoDate,
      platform: z.enum(TROUBLESHOOTING_PLATFORMS),
      environment: text(160),
      during: text(160),
    })
    .optional(),
});

export const TROUBLESHOOTING_SETS = ['npm-vite', 'python-streamlit'] as const;
export type TroubleshootingSet = (typeof TROUBLESHOOTING_SETS)[number];

export const sharedTroubleshootingSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sets: z.strictObject({
    'npm-vite': z.array(troubleshootingEntrySchema).min(1),
    'python-streamlit': z.array(troubleshootingEntrySchema).min(1),
  }),
});

export const learningGuideSchema = z
  .strictObject({
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    templateId: id,
    audience: z.strictObject({
      summary: text(400),
      /** What a student should already know before starting. */
      knowledge: z.array(text(200)).min(1).max(8),
    }),
    architecture: architectureSchema,
    walkthrough: z.array(walkthroughEntrySchema).min(3).max(24),
    checklist: z.array(checklistItemSchema).min(8).max(40),
    viva: z.array(vivaQuestionSchema).min(8).max(60),
    /** Steps for a live demonstration, in order. */
    demo: z.array(text(240)).min(3).max(15),
    /** Navigation labels as the app shows them, used by the customization preview. */
    preview: z.strictObject({
      layout: z.enum(['top-navigation', 'sidebar']),
      navigation: z.array(z.string().trim().min(2).max(30)).min(2).max(8),
    }),
    troubleshooting: z.strictObject({
      include: z.array(z.enum(TROUBLESHOOTING_SETS)).max(TROUBLESHOOTING_SETS.length),
      entries: z.array(troubleshootingEntrySchema).max(30),
    }),
  })
  .superRefine((guide, ctx) => {
    const unique = (values: string[], path: (string | number)[], what: string) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, index, 'id'],
            message: `Duplicate ${what} id "${value}"`,
          });
        }
        seen.add(value);
      });
    };
    const { layers, components, connections, flows } = guide.architecture;
    unique(
      layers.map((layer) => layer.id),
      ['architecture', 'layers'],
      'layer',
    );
    unique(
      components.map((component) => component.id),
      ['architecture', 'components'],
      'component',
    );
    unique(
      flows.map((flow) => flow.id),
      ['architecture', 'flows'],
      'flow',
    );
    unique(
      guide.walkthrough.map((entry) => entry.id),
      ['walkthrough'],
      'walkthrough',
    );
    unique(
      guide.checklist.map((item) => item.id),
      ['checklist'],
      'checklist',
    );
    unique(
      guide.viva.map((question) => question.id),
      ['viva'],
      'question',
    );
    unique(
      guide.troubleshooting.entries.map((entry) => entry.id),
      ['troubleshooting', 'entries'],
      'troubleshooting',
    );

    const layerIds = new Set(layers.map((layer) => layer.id));
    const componentIds = new Set(components.map((component) => component.id));
    components.forEach((component, index) => {
      if (!layerIds.has(component.layer)) {
        ctx.addIssue({
          code: 'custom',
          path: ['architecture', 'components', index, 'layer'],
          message: `Unknown layer "${component.layer}"`,
        });
      }
    });
    connections.forEach((connection, index) => {
      for (const end of ['from', 'to'] as const) {
        if (!componentIds.has(connection[end])) {
          ctx.addIssue({
            code: 'custom',
            path: ['architecture', 'connections', index, end],
            message: `Unknown component "${connection[end]}"`,
          });
        }
      }
    });
    flows.forEach((flow, flowIndex) => {
      flow.steps.forEach((step, stepIndex) => {
        if (!componentIds.has(step.component)) {
          ctx.addIssue({
            code: 'custom',
            path: ['architecture', 'flows', flowIndex, 'steps', stepIndex, 'component'],
            message: `Unknown component "${step.component}"`,
          });
        }
      });
    });
    for (const layer of layers) {
      if (!components.some((component) => component.layer === layer.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['architecture', 'layers'],
          message: `Layer "${layer.id}" has no components`,
        });
      }
    }
    guide.viva.forEach((question, index) => {
      const labels = question.keyConcepts.map((concept) => concept.label.toLowerCase());
      if (new Set(labels).size !== labels.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['viva', index, 'keyConcepts'],
          message: 'Key concept labels must be unique',
        });
      }
    });
  });

export type SymbolRef = z.infer<typeof symbolRefSchema>;
export type Architecture = z.infer<typeof architectureSchema>;
export type ArchitectureComponent = Architecture['components'][number];
export type WalkthroughEntry = z.infer<typeof walkthroughEntrySchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type VivaQuestion = z.infer<typeof vivaQuestionSchema>;
export type TroubleshootingEntry = z.infer<typeof troubleshootingEntrySchema>;
export type TroubleshootingStep = z.infer<typeof troubleshootingStepSchema>;
export type SharedTroubleshooting = z.infer<typeof sharedTroubleshootingSchema>;
export type LearningGuide = z.infer<typeof learningGuideSchema>;

// ---------------------------------------------------------------------------
// Finding symbols in source files
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function definitionPatterns(path: string, name: string): RegExp[] {
  const n = escapeRegExp(name);
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) {
    return [
      new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\*?\\s+${n}\\b`),
      new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+${n}\\b`),
      new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?class\\s+${n}\\b`),
      new RegExp(`^\\s*(?:export\\s+)?(?:interface|type|enum)\\s+${n}\\b`),
    ];
  }
  if (path.endsWith('.py')) {
    return [
      new RegExp(`^\\s*(?:async\\s+)?def\\s+${n}\\s*\\(`),
      new RegExp(`^\\s*class\\s+${n}\\b`),
      new RegExp(`^${n}\\s*(?::[^=]+)?=`),
    ];
  }
  if (path.endsWith('.json')) return [new RegExp(`^\\s*"${n}"\\s*:`)];
  if (path.endsWith('.toml')) return [new RegExp(`^\\s*${n}\\s*=`), new RegExp(`^\\s*\\[${n}\\]`)];
  return [];
}

/**
 * The 1-based line where `name` is defined in a file (a function, class,
 * type, constant, JSON key or TOML setting), or null when it isn't defined
 * there. Used by the catalog validator and by the source browser.
 */
export function findSymbolLine(path: string, content: string, name: string): number | null {
  const patterns = definitionPatterns(path, name);
  if (patterns.length === 0) return null;
  const lines = content.split('\n');
  for (const [index, line] of lines.entries()) {
    if (patterns.some((pattern) => pattern.test(line))) return index + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Commands in troubleshooting steps
// ---------------------------------------------------------------------------

/**
 * Commands a beginner could lose work or change their computer with. The
 * guides recommend safer alternatives instead (for example `npm ci`, which
 * rebuilds node_modules from the lockfile by itself).
 */
const UNSAFE_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\brm\s+(-\w*\s+)*-\w*[rf]/i, 'deletes files'],
  [/\b(rmdir|rd|del|erase)\b/i, 'deletes files'],
  [/\bRemove-Item\b/i, 'deletes files'],
  [/\bsudo\b|\brunas\b/i, 'runs with administrator rights'],
  [/\b(chmod|chown|icacls|takeown)\b/i, 'changes file permissions'],
  [/\bSet-ExecutionPolicy\b|\breg(\.exe)?\s+(add|delete)\b|\bsetx\b/i, 'changes system settings'],
  [/\b(mkfs|diskpart)\b|\bformat\s+[a-z]:|\bdd\s+if=/i, 'can erase a disk'],
  [/\|\s*(sh|bash|zsh|iex|Invoke-Expression)\b/i, 'runs a downloaded script'],
  [/\bgit\s+(reset\s+--hard|clean\b|checkout\s+--\s)/i, 'discards changes'],
  [/\bnpm\s+(cache\s+clean|audit\s+fix\s+--force)\b/i, 'can break the installation'],
  [/\bpip\s+uninstall\b|--break-system-packages/i, 'can break the installation'],
  [/\bkill(all)?\b|\btaskkill\b|\bStop-Process\b/i, 'stops processes by force'],
];

/** The reason a command is unsafe for a troubleshooting guide, or null. */
export function unsafeCommandReason(command: string): string | null {
  for (const [pattern, reason] of UNSAFE_COMMANDS) if (pattern.test(command)) return reason;
  return null;
}
