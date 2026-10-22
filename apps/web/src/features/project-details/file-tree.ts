/** Turns a flat list of file paths into a sorted folder tree. */
import type { BundleFile } from '@campuskit/template-engine';

export interface TreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

export interface TreeFile {
  kind: 'file';
  name: string;
  path: string;
  size: number;
}

export type TreeNode = TreeFolder | TreeFile;

export function buildFileTree(files: readonly Pick<BundleFile, 'path' | 'size'>[]): TreeFolder {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const file of files) {
    const segments = file.path.split('/');
    let folder = root;
    segments.slice(0, -1).forEach((segment, index) => {
      const path = segments.slice(0, index + 1).join('/');
      let next = folder.children.find(
        (child): child is TreeFolder => child.kind === 'folder' && child.name === segment,
      );
      if (!next) {
        next = { kind: 'folder', name: segment, path, children: [] };
        folder.children.push(next);
      }
      folder = next;
    });
    folder.children.push({
      kind: 'file',
      name: segments[segments.length - 1] ?? file.path,
      path: file.path,
      size: file.size,
    });
  }
  sortTree(root);
  return root;
}

/** Folders first, then files, each alphabetically. */
function sortTree(folder: TreeFolder): void {
  folder.children.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name, 'en') : a.kind === 'folder' ? -1 : 1,
  );
  for (const child of folder.children) if (child.kind === 'folder') sortTree(child);
}

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export function imageMimeType(path: string): string | undefined {
  return IMAGE_TYPES[path.split('.').pop()?.toLowerCase() ?? ''];
}
