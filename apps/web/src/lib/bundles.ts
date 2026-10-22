/**
 * Loads template bundles (the template files, serialised as JSON) for the
 * generator and the source browser. Bundles are fetched only when needed and
 * validated before use.
 */
import { templateBundleSchema, type TemplateBundle } from '@campuskit/template-engine';
import bundlePaths from 'virtual:template-bundles';

export type BundleLoader = (templateId: string) => Promise<TemplateBundle>;

export class BundleLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleLoadError';
  }
}

const cache = new Map<string, Promise<TemplateBundle>>();

export const fetchTemplateBundle: BundleLoader = (templateId) => {
  const cached = cache.get(templateId);
  if (cached) return cached;

  const path = bundlePaths[templateId];
  if (!path)
    return Promise.reject(
      new BundleLoadError(`No files are published for the template "${templateId}".`),
    );

  const request = (async () => {
    let response: Response;
    try {
      response = await fetch(`${import.meta.env.BASE_URL}${path}`);
    } catch {
      throw new BundleLoadError(
        'The template files could not be downloaded. Check your connection and try again.',
      );
    }
    if (!response.ok) {
      throw new BundleLoadError(
        `The template files could not be downloaded (HTTP ${response.status}).`,
      );
    }
    const parsed = templateBundleSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new BundleLoadError('The template files are damaged. Reload the page and try again.');
    return parsed.data;
  })();

  cache.set(templateId, request);
  request.catch(() => cache.delete(templateId)); // allow a retry after a failure
  return request;
};
