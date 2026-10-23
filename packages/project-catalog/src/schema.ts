/**
 * The project manifest schema: one JSON file per project in manifests/.
 *
 * The same validated manifests drive the gallery, the project pages and the
 * generator, so a project can never advertise a feature, option or command
 * that its manifest (and template) does not actually contain.
 */
import { customizationSpecSchema, isSafeRelativePath } from '@campuskit/template-engine';
import { z } from './zod.ts';

export const CATEGORIES = ['web-development', 'data-analysis', 'ai-ml'] as const;
export const PROJECT_TYPES = [
  'web-app',
  'data-app',
  'command-line',
  'notebook',
  'api',
  'game',
] as const;
export const AUDIENCES = ['school', 'college'] as const;
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const PACKAGE_MANAGERS = ['npm', 'pip'] as const;
export const DOC_KINDS = ['readme', 'architecture', 'viva', 'guide'] as const;
/** Where the project's code runs besides the browser. */
export const BACKEND_KINDS = ['none', 'local-server', 'remote-server'] as const;
/** Where the project keeps data between runs. */
export const PERSISTENCE_KINDS = ['browser-storage', 'files', 'database', 'none'] as const;

/** Documents every non-draft template must include, besides the README. */
const REQUIRED_DOCS: ReadonlyArray<readonly [(typeof DOC_KINDS)[number], string]> = [
  ['architecture', 'an architecture document (docs/ARCHITECTURE.md)'],
  ['viva', 'viva questions with answers (docs/VIVA_QUESTIONS.md)'],
];

export type Category = (typeof CATEGORIES)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];
export type Audience = (typeof AUDIENCES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type BackendKind = (typeof BACKEND_KINDS)[number];
export type PersistenceKind = (typeof PERSISTENCE_KINDS)[number];

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Not a real date');
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Use a version like 1.0.0');
const sentence = z.string().trim().min(3).max(400);
const shortText = z.string().trim().min(1).max(80);
const httpsUrl = z.string().regex(/^https:\/\/[^\s]+$/, 'Use a full https:// URL');
const templatePath = z
  .string()
  .refine(isSafeRelativePath, 'Must be a safe relative path inside the template');

export const commandSchema = z.strictObject({
  command: z.string().min(1).max(300),
  platform: z.enum(['all', 'windows', 'macos-linux']),
  label: z.string().max(120).optional(),
});

export const setupStepSchema = z.strictObject({
  title: z.string().min(3).max(80),
  commands: z.array(commandSchema).max(10),
  note: z.string().max(400).optional(),
});

export const prerequisiteSchema = z.strictObject({
  name: shortText,
  version: z.string().max(40).optional(),
  url: httpsUrl.optional(),
  note: z.string().max(200).optional(),
});

export const screenshotSchema = z.strictObject({
  file: templatePath,
  alt: z.string().trim().min(10).max(200),
  caption: z.string().max(160).optional(),
});

export const docReferenceSchema = z.strictObject({
  title: shortText,
  file: templatePath,
  kind: z.enum(DOC_KINDS),
});

export const environmentVariableSchema = z.strictObject({
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  required: z.boolean(),
  description: sentence,
  example: z.string().max(120),
});

export const manifestSchema = z
  .strictObject({
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    id: slug,
    slug,
    name: z.string().trim().min(3).max(60),
    tagline: z.string().trim().min(10).max(140),
    description: z.string().trim().min(40).max(1200),
    category: z.enum(CATEGORIES),
    projectType: z.enum(PROJECT_TYPES),
    tags: z.array(slug).min(1).max(12),
    audience: z.array(z.enum(AUDIENCES)).min(1),
    difficulty: z.enum(DIFFICULTIES),
    languages: z.array(shortText).min(1).max(6),
    frameworks: z.array(shortText).max(8),
    version: semver,
    addedOn: isoDate,
    updatedOn: isoDate,
    featured: z.boolean(),
    /**
     * Set to true while a template is being written or reviewed. Drafts are
     * labelled on every screen and are never shown as verified.
     */
    draft: z.boolean().optional(),
    features: z.array(sentence).min(3).max(20),
    limitations: z.array(sentence).min(1).max(12),
    learningObjectives: z.array(sentence).min(2).max(12),
    ideasForExtension: z.array(sentence).min(2).max(10),
    prerequisites: z.array(prerequisiteSchema).min(1).max(8),
    setup: z.strictObject({
      steps: z.array(setupStepSchema).min(2).max(10),
      localUrl: z
        .string()
        .regex(/^http:\/\/localhost:\d{2,5}\/$/)
        .optional(),
      notes: z.array(sentence).max(8),
    }),
    testing: z.strictObject({
      tools: z.array(shortText).min(1),
      commands: z.array(commandSchema).min(1),
      covers: z.array(sentence).min(1).max(12),
    }),
    environment: z.strictObject({
      variables: z.array(environmentVariableSchema).max(20),
    }),
    stack: z.strictObject({
      backend: z.enum(BACKEND_KINDS),
      persistence: z.enum(PERSISTENCE_KINDS),
      /** One or two sentences: where the code runs and where data lives. */
      summary: sentence,
    }),
    network: z.strictObject({
      installNeedsInternet: z.boolean(),
      runsOffline: z.boolean(),
      externalServices: z.array(sentence).max(10),
      notes: sentence,
    }),
    media: z.strictObject({
      cover: templatePath,
      screenshots: z.array(screenshotSchema).min(1).max(8),
    }),
    docs: z.array(docReferenceSchema).min(1).max(12),
    template: z.strictObject({
      directory: z
        .string()
        .refine((value) => isSafeRelativePath(value) && value.startsWith('templates/'), {
          message: 'Must be a folder inside templates/, e.g. "templates/my-project"',
        }),
      packageManager: z.enum(PACKAGE_MANAGERS),
    }),
    customization: customizationSpecSchema,
    license: z.strictObject({
      spdx: z.enum(['MIT', 'Apache-2.0', 'BSD-3-Clause']),
      file: templatePath,
      attribution: sentence,
      thirdParty: z
        .array(z.strictObject({ name: shortText, license: shortText, url: httpsUrl }))
        .max(20),
    }),
    repositoryUrl: httpsUrl.nullable(),
  })
  .superRefine((manifest, ctx) => {
    if (manifest.updatedOn < manifest.addedOn) {
      ctx.addIssue({
        code: 'custom',
        path: ['updatedOn'],
        message: 'updatedOn is earlier than addedOn',
      });
    }
    if (!manifest.media.screenshots.some((shot) => shot.file === manifest.media.cover)) {
      ctx.addIssue({
        code: 'custom',
        path: ['media', 'cover'],
        message: 'The cover must be one of the screenshots',
      });
    }
    if (!manifest.docs.some((doc) => doc.kind === 'readme')) {
      ctx.addIssue({
        code: 'custom',
        path: ['docs'],
        message: 'Every project needs a README document',
      });
    }
    // Students prepare for their viva from these documents, so a template is only
    // complete with both. Drafts may add them later.
    if (!manifest.draft) {
      for (const [kind, name] of REQUIRED_DOCS) {
        if (!manifest.docs.some((doc) => doc.kind === kind)) {
          ctx.addIssue({
            code: 'custom',
            path: ['docs'],
            message: `Add ${name} (a docs entry with "kind": "${kind}"), or set "draft": true until it is written`,
          });
        }
      }
    }
    if (manifest.stack.backend === 'remote-server' && manifest.network.runsOffline) {
      ctx.addIssue({
        code: 'custom',
        path: ['network', 'runsOffline'],
        message: 'A project that needs an online server cannot run offline',
      });
    }
    if (manifest.draft && manifest.featured) {
      ctx.addIssue({
        code: 'custom',
        path: ['featured'],
        message: 'Draft templates cannot be featured',
      });
    }
    if (new Set(manifest.tags).size !== manifest.tags.length) {
      ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Tags must be unique' });
    }
    if (new Set(manifest.audience).size !== manifest.audience.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['audience'],
        message: 'Audience values must be unique',
      });
    }
  });

export type ProjectManifest = z.infer<typeof manifestSchema>;
export type SetupStepDefinition = z.infer<typeof setupStepSchema>;
export type Screenshot = z.infer<typeof screenshotSchema>;
export type DocReference = z.infer<typeof docReferenceSchema>;
