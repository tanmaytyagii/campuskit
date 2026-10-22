/**
 * "Download with default settings" on the project page: the same engine and
 * the same checks as the generator, with the template's default values.
 */
import type { ProjectManifest } from '@campuskit/project-catalog';
import { useState } from 'react';

import { useBundleLoader } from '../../lib/bundle-context.tsx';
import { downloadFile } from '../../lib/download.ts';
import { buildZip, initialFormValues, planProject } from '../generator/logic.ts';

export type QuickDownloadState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; fileName: string }
  | { status: 'error'; message: string };

export function useQuickDownload(project: ProjectManifest) {
  const loader = useBundleLoader();
  const [state, setState] = useState<QuickDownloadState>({ status: 'idle' });

  async function download() {
    setState({ status: 'working' });
    try {
      const bundle = await loader(project.id);
      const result = await buildZip(planProject(project, bundle, initialFormValues(project)));
      downloadFile(result.zip, result.fileName, 'application/zip');
      setState({ status: 'done', fileName: result.fileName });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The ZIP could not be created.',
      });
    }
  }

  return { state, download };
}
