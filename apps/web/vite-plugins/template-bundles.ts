/**
 * Vite plugin that turns each template folder into a JSON "bundle" the
 * generator can download and customize in the browser.
 *
 *  - In development, bundles are built from disk on every request, so edits to
 *    a template show up immediately.
 *  - In production builds, bundles are emitted as content-hashed assets
 *    (template-bundles/<id>.<hash>.json) so browsers never use a stale copy.
 *
 * The app imports `virtual:template-bundles`, which maps template ids to the
 * bundle paths (relative to the site's base URL), and
 * `virtual:template-verification`, which gives each template's fingerprint
 * (computed from the files being published) and its verification record, so
 * the site can show whether those exact files were verified.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The schema entry point avoids loading the manifests, which Node can't import without attributes.
import { manifestSchema } from '@campuskit/project-catalog/schema';
import { readVerificationRecords, templateFingerprint } from '@campuskit/project-catalog/node';
import { buildTemplateBundle } from '@campuskit/template-engine/node';
import type { Plugin, ResolvedConfig } from 'vite';

const VIRTUAL_ID = 'virtual:template-bundles';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const VERIFICATION_ID = 'virtual:template-verification';
const RESOLVED_VERIFICATION_ID = `\0${VERIFICATION_ID}`;

interface TemplateInfo {
  id: string;
  version: string;
  directory: string;
}

/** Reads the three fields the plugin needs; the catalog package validates the rest. */
async function readTemplates(repoRoot: string): Promise<TemplateInfo[]> {
  const manifestsDir = join(repoRoot, 'packages', 'project-catalog', 'manifests');
  const files = (await readdir(manifestsDir)).filter((file) => file.endsWith('.json')).sort();
  const templates: TemplateInfo[] = [];
  for (const file of files) {
    const data = JSON.parse(await readFile(join(manifestsDir, file), 'utf8')) as {
      id?: unknown;
      version?: unknown;
      template?: { directory?: unknown };
    };
    if (
      typeof data.id !== 'string' ||
      typeof data.version !== 'string' ||
      typeof data.template?.directory !== 'string'
    ) {
      throw new Error(
        `${file} is missing id, version or template.directory. Run "pnpm validate:catalog" for details.`,
      );
    }
    templates.push({ id: data.id, version: data.version, directory: data.template.directory });
  }
  return templates;
}

async function bundleJson(repoRoot: string, template: TemplateInfo): Promise<string> {
  const { bundle } = await buildTemplateBundle(join(repoRoot, template.directory), {
    templateId: template.id,
    templateVersion: template.version,
  });
  return JSON.stringify(bundle);
}

/** Template id -> { fingerprint, record }. Invalid manifests are left for the catalog to report. */
async function verificationModule(repoRoot: string): Promise<string> {
  const catalogDir = join(repoRoot, 'packages', 'project-catalog');
  const { records } = await readVerificationRecords(join(catalogDir, 'verification'));
  const result: Record<string, { fingerprint: string | null; record: unknown }> = {};
  for (const template of await readTemplates(repoRoot)) {
    const raw = JSON.parse(
      await readFile(join(catalogDir, 'manifests', `${template.id}.json`), 'utf8'),
    ) as unknown;
    const manifest = manifestSchema.safeParse(raw);
    let fingerprint: string | null = null;
    if (manifest.success) {
      const { bundle } = await buildTemplateBundle(join(repoRoot, template.directory), {
        templateId: template.id,
        templateVersion: template.version,
      });
      fingerprint = templateFingerprint(manifest.data, bundle.files);
    }
    result[template.id] = { fingerprint, record: records.get(template.id) ?? null };
  }
  return `export default ${JSON.stringify(result)};\n`;
}

export function templateBundles(options: { repoRoot: string }): Plugin {
  let config: ResolvedConfig;
  const emitted = new Map<string, string>();

  return {
    name: 'campuskit-template-bundles',

    configResolved(resolved) {
      config = resolved;
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      if (id === VERIFICATION_ID) return RESOLVED_VERIFICATION_ID;
      return undefined;
    },

    async buildStart() {
      if (config.command !== 'build') return;
      emitted.clear();
      for (const template of await readTemplates(options.repoRoot)) {
        const source = await bundleJson(options.repoRoot, template);
        const hash = createHash('sha256').update(source).digest('hex').slice(0, 10);
        const fileName = `template-bundles/${template.id}.${hash}.json`;
        this.emitFile({ type: 'asset', fileName, source });
        emitted.set(template.id, fileName);
      }
    },

    async load(id) {
      if (id === RESOLVED_VERIFICATION_ID) return verificationModule(options.repoRoot);
      if (id !== RESOLVED_ID) return undefined;
      const paths =
        config.command === 'build'
          ? Object.fromEntries(emitted)
          : Object.fromEntries(
              (await readTemplates(options.repoRoot)).map((template) => [
                template.id,
                `template-bundles/${template.id}.json`,
              ]),
            );
      return `export default ${JSON.stringify(paths)};\n`;
    },

    configureServer(server) {
      // Recompute statuses when a template or a verification record changes.
      const watched = [
        join(options.repoRoot, 'templates'),
        join(options.repoRoot, 'packages', 'project-catalog'),
      ];
      const refresh = (file: string) => {
        if (!watched.some((directory) => file.startsWith(directory))) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_VERIFICATION_ID);
        if (module) server.moduleGraph.invalidateModule(module);
      };
      server.watcher.on('change', refresh);
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);

      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const match = /\/template-bundles\/([a-z0-9-]+)\.json$/.exec(pathname);
        if (!match) {
          next();
          return;
        }
        void (async () => {
          try {
            const template = (await readTemplates(options.repoRoot)).find(
              (item) => item.id === match[1],
            );
            if (!template) {
              response.statusCode = 404;
              response.end('Unknown template');
              return;
            }
            response.setHeader('content-type', 'application/json; charset=utf-8');
            response.setHeader('cache-control', 'no-store');
            response.end(await bundleJson(options.repoRoot, template));
          } catch (error) {
            response.statusCode = 500;
            response.end(
              error instanceof Error ? error.message : 'Could not build the template bundle',
            );
          }
        })();
      });
    },
  };
}
