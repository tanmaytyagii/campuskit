/**
 * Path safety for template files and archive entries.
 *
 * Every path that enters a generated ZIP passes through `assertSafeRelativePath`.
 * The rules are deliberately strict: template authors only need ordinary file
 * names, and rejecting everything unusual closes off path traversal
 * ("zip slip"), absolute paths, Windows drive letters and device names, and
 * look-alike Unicode characters in one place.
 */

export class UnsafePathError extends Error {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`Unsafe path "${printable(path)}": ${reason}`);
    this.name = 'UnsafePathError';
    this.path = path;
  }
}

/** Maximum length of a relative path inside a template. */
export const MAX_PATH_LENGTH = 200;
/** Maximum folder depth inside a template. */
export const MAX_PATH_DEPTH = 12;

const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

function printable(value: string): string {
  // Show control characters visibly in error messages instead of printing them raw.
  return value.replace(
    CONTROL_CHARACTERS,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

/**
 * Throws `UnsafePathError` unless `path` is a safe, already-normalised POSIX
 * relative path such as `src/App.tsx` or `.streamlit/config.toml`.
 *
 * The function never "repairs" a path: a template containing a suspicious
 * name is a bug that should be fixed at the source, not silently rewritten.
 */
export function assertSafeRelativePath(path: string): void {
  if (typeof path !== 'string' || path.length === 0) {
    throw new UnsafePathError(String(path), 'the path is empty');
  }
  if (path.length > MAX_PATH_LENGTH) {
    throw new UnsafePathError(path, `the path is longer than ${MAX_PATH_LENGTH} characters`);
  }
  if (path.includes('\\')) {
    throw new UnsafePathError(path, 'backslashes are not allowed; use forward slashes');
  }
  if (path.startsWith('/')) {
    throw new UnsafePathError(path, 'absolute paths are not allowed');
  }
  if (/^[A-Za-z]:/.test(path)) {
    throw new UnsafePathError(path, 'drive letters are not allowed');
  }

  const segments = path.split('/');
  if (segments.length > MAX_PATH_DEPTH) {
    throw new UnsafePathError(path, `folders may be nested at most ${MAX_PATH_DEPTH} levels deep`);
  }

  for (const segment of segments) {
    if (segment === '') {
      throw new UnsafePathError(
        path,
        'empty path segments ("//" or a trailing "/") are not allowed',
      );
    }
    if (segment === '.' || segment === '..') {
      throw new UnsafePathError(path, '"." and ".." segments are not allowed');
    }
    if (!SEGMENT_PATTERN.test(segment)) {
      throw new UnsafePathError(
        path,
        'file and folder names may only contain ASCII letters, digits, ".", "_" and "-"',
      );
    }
    if (WINDOWS_RESERVED.test(segment)) {
      throw new UnsafePathError(path, `"${segment}" is a reserved device name on Windows`);
    }
    if (segment.endsWith('.')) {
      throw new UnsafePathError(path, 'names ending with "." cannot be created on Windows');
    }
  }
}

export function isSafeRelativePath(path: string): boolean {
  try {
    assertSafeRelativePath(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Archive entries read back from a ZIP may carry a trailing "/" for folders and
 * must stay inside the archive. This check is used when inspecting generated
 * archives (tests and the verification script), never to "clean" names.
 */
export function assertSafeArchiveEntry(name: string): void {
  const withoutTrailingSlash = name.endsWith('/') ? name.slice(0, -1) : name;
  assertSafeRelativePath(withoutTrailingSlash);
}

// ---------------------------------------------------------------------------
// Exclusion policy: files that must never be copied into a generated project.
// ---------------------------------------------------------------------------

const EXCLUDED_DIRECTORIES: ReadonlyMap<string, string> = new Map([
  ['node_modules', 'installed dependencies are recreated by the package manager'],
  ['dist', 'build output is recreated by the build command'],
  ['build', 'build output is recreated by the build command'],
  ['coverage', 'test coverage output is generated locally'],
  ['.git', 'version-control history belongs to the original repository'],
  ['.svn', 'version-control history belongs to the original repository'],
  ['.hg', 'version-control history belongs to the original repository'],
  ['.vite', 'tool cache'],
  ['.cache', 'tool cache'],
  ['.parcel-cache', 'tool cache'],
  ['.turbo', 'tool cache'],
  ['__pycache__', 'Python bytecode cache'],
  ['.pytest_cache', 'test cache'],
  ['.mypy_cache', 'type-checker cache'],
  ['.ruff_cache', 'linter cache'],
  ['.venv', 'Python virtual environments are created locally'],
  ['venv', 'Python virtual environments are created locally'],
  ['.tox', 'test environments are created locally'],
  ['.ipynb_checkpoints', 'notebook autosave data'],
  ['.idea', 'personal editor settings'],
  ['.vscode', 'personal editor settings'],
  ['playwright-report', 'test report output'],
  ['test-results', 'test report output'],
]);

/** Names that may hold credentials. Matching files are excluded, and the catalog validator rejects templates that contain them. */
const SECRET_FILES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\.env$/, 'environment files can contain secrets'],
  [/^\.env\.(?!example$|sample$|template$).+$/, 'environment files can contain secrets'],
  [/^secrets\.toml$/, 'Streamlit secrets must never be shared'],
  [/^\.npmrc$/, 'package-manager config files can contain access tokens'],
  [/^\.pypirc$/, 'package-index config files can contain access tokens'],
  [/^\.netrc$/, 'credential files must never be shared'],
  [/\.(pem|key|p12|pfx|jks|keystore)$/i, 'private keys and certificates must never be shared'],
  [/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/, 'SSH keys must never be shared'],
];

const EXCLUDED_FILES: ReadonlyArray<readonly [RegExp, string]> = [
  ...SECRET_FILES,
  [/\.(sqlite|sqlite3|db)$/i, 'local databases can contain personal data'],
  [/\.py[cod]$/, 'Python bytecode is generated locally'],
  [/\.tsbuildinfo$/, 'TypeScript build cache'],
  [/\.log$/, 'log files are generated locally'],
  [/^\.DS_Store$/, 'operating-system metadata'],
  [/^Thumbs\.db$/, 'operating-system metadata'],
  [/^desktop\.ini$/i, 'operating-system metadata'],
];

/**
 * Returns a human-readable reason when `path` must be excluded from generated
 * projects, or `null` when the file may be included.
 *
 * Hidden files are not excluded by default: `.gitignore`, `.env.example` and
 * `.streamlit/config.toml` are part of a working project.
 */
export function getExclusionReason(path: string): string | null {
  const segments = path.split('/');
  const fileName = segments[segments.length - 1] ?? '';

  for (const segment of segments.slice(0, -1)) {
    const reason = EXCLUDED_DIRECTORIES.get(segment);
    if (reason) return `${segment}/ is excluded: ${reason}`;
  }
  // A file can also be named like an excluded directory (rare, but be consistent).
  const directoryReason = EXCLUDED_DIRECTORIES.get(fileName);
  if (directoryReason) return `${fileName} is excluded: ${directoryReason}`;

  for (const [pattern, reason] of EXCLUDED_FILES) {
    if (pattern.test(fileName)) return `${fileName} is excluded: ${reason}`;
  }
  return null;
}

/** True for files that may contain credentials, such as `.env` or private keys. */
export function isSecretPath(path: string): boolean {
  const fileName = path.split('/').at(-1) ?? '';
  return SECRET_FILES.some(([pattern]) => pattern.test(fileName));
}

export function isExcludedPath(path: string): boolean {
  return getExclusionReason(path) !== null;
}

/** Directory names the bundler never descends into. */
export function isExcludedDirectoryName(name: string): boolean {
  return EXCLUDED_DIRECTORIES.has(name);
}

/** File names reserved for files the generator adds itself. */
export const RESERVED_OUTPUT_FILES: ReadonlySet<string> = new Set(['GETTING_STARTED.md']);
