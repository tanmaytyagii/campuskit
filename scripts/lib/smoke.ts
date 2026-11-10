/**
 * The parts of `pnpm smoke` that don't need a browser: waiting for a deployment with bounded
 * retries, and checking what it served. Kept apart so they can be tested without a network.
 */

export type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;
export type Sleep = (ms: number) => Promise<void>;

export const sleep: Sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Waits that double each time, from `firstMs`, never longer than `maxMs`. */
export function backoffDelays(attempts: number, firstMs: number, maxMs: number): number[] {
  return Array.from({ length: Math.max(0, attempts - 1) }, (_, index) =>
    Math.min(maxMs, firstMs * 2 ** index),
  );
}

/**
 * Whether a status may come right by itself: GitHub's CDN answers 502–504 or 429 for a few
 * seconds after a deployment. A 404 or 500 is the site's answer and is not retried.
 */
export function isTransient(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export interface RetryOptions {
  attempts?: number;
  firstDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: Fetch;
  wait?: Sleep;
}

/** One line per try, for the report when every try failed. */
export class RetryError extends Error {
  constructor(
    message: string,
    readonly tries: string[],
  ) {
    super(`${message}\n${tries.map((line) => `  - ${line}`).join('\n')}`);
  }
}

/**
 * Fetches `url`, trying again after network errors, time-outs and transient statuses, with
 * doubling waits. Any other response, success or not, is returned as it is.
 */
export async function fetchWithRetry(url: string, options: RetryOptions = {}): Promise<Response> {
  const {
    attempts = 6,
    firstDelayMs = 2000,
    maxDelayMs = 30_000,
    timeoutMs = 20_000,
    fetchImpl = fetch,
    wait = sleep,
  } = options;
  const delays = backoffDelays(attempts, firstDelayMs, maxDelayMs);
  const tries: string[] = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!isTransient(response.status)) return response;
      tries.push(`HTTP ${response.status}`);
    } catch (error) {
      tries.push((error as Error).message);
    }
    const delay = delays[attempt];
    if (delay !== undefined) await wait(delay);
  }
  throw new RetryError(`${url} didn't answer after ${attempts} tries:`, tries);
}

/** The hashed entry script an index.html loads, such as "assets/index-i3mSqvYD.js". */
export function entryScript(html: string): string | null {
  return /<script[^>]+src="[^"]*?(assets\/index-[\w-]+\.js)"/.exec(html)?.[1] ?? null;
}

/** Every script, stylesheet, preload and icon an index.html refers to, as absolute URLs. */
export function linkedAssets(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"#]+)"/g)) {
    const value = match[1];
    if (value && !value.startsWith('data:')) urls.add(new URL(value, pageUrl).toString());
  }
  return [...urls];
}

/**
 * Waits until the site serves the build that was just deployed: its index.html must load
 * `expected` (the entry script the build job produced). Each check asks past caches.
 */
export async function waitForDeployment(
  baseUrl: string,
  expected: string,
  options: RetryOptions & { checks?: number; intervalMs?: number } = {},
): Promise<{ checks: number; html: string }> {
  const { checks = 20, intervalMs = 15_000, wait = sleep } = options;
  const seen: string[] = [];
  for (let check = 1; check <= checks; check += 1) {
    const url = new URL(baseUrl);
    url.searchParams.set('smoke', `${Date.now()}-${check}`);
    try {
      const response = await fetchWithRetry(url.toString(), options);
      const html = await response.text();
      const served = entryScript(html);
      if (response.ok && served === expected) return { checks: check, html };
      seen.push(`HTTP ${response.status}, serving ${served ?? 'no entry script'}`);
    } catch (error) {
      seen.push((error as Error).message.split('\n')[0] ?? 'unknown error');
    }
    if (check < checks) await wait(intervalMs);
  }
  throw new RetryError(`${baseUrl} never served the new build (${expected}):`, seen);
}

/** Problems with a downloaded project ZIP: one root folder holding the files every project has. */
export function zipProblems(names: readonly string[], required: readonly string[]): string[] {
  const files = names.filter((name) => !name.endsWith('/'));
  if (files.length === 0) return ['the ZIP is empty'];
  const roots = new Set(files.map((name) => name.split('/')[0]));
  if (roots.size !== 1) return [`expected one root folder, found ${[...roots].join(', ')}`];
  const [root] = roots;
  const problems = required
    .filter((file) => !files.includes(`${root}/${file}`))
    .map((file) => `${file} is missing`);
  const unsafe = files.filter((name) => name.split('/').includes('..') || name.startsWith('/'));
  return [...problems, ...unsafe.map((name) => `unsafe path ${name}`)];
}

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

/** A Markdown table of the checks for the GitHub Actions job summary. */
export function summaryTable(siteUrl: string, results: readonly CheckResult[]): string {
  const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const failed = results.filter((result) => !result.ok).length;
  return [
    `## Smoke test of ${siteUrl}`,
    '',
    failed === 0
      ? `All ${results.length} checks passed.`
      : `**${failed} of ${results.length} checks failed.**`,
    '',
    '| Check | Result | Detail |',
    '| --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${cell(result.name)} | ${result.ok ? 'Passed' : '**Failed**'} | ${cell(result.detail)} |`,
    ),
    '',
  ].join('\n');
}
