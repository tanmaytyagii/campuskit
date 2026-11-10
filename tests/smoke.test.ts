import { describe, expect, it } from 'vitest';

import {
  backoffDelays,
  entryScript,
  fetchWithRetry,
  isTransient,
  linkedAssets,
  summaryTable,
  waitForDeployment,
  zipProblems,
  type Fetch,
} from '../scripts/lib/smoke.ts';

/** A fetch that answers with the given statuses in turn (an Error means a network failure). */
function scripted(answers: Array<number | Error | { status: number; body: string }>): {
  fetchImpl: Fetch;
  urls: string[];
} {
  const urls: string[] = [];
  let index = 0;
  const fetchImpl: Fetch = (url) => {
    urls.push(url);
    const answer = answers[Math.min(index, answers.length - 1)];
    index += 1;
    if (answer instanceof Error) return Promise.reject(answer);
    const { status, body } = typeof answer === 'number' ? { status: answer, body: '' } : answer!;
    return Promise.resolve(new Response(body, { status }));
  };
  return { fetchImpl, urls };
}

const noWait = () => Promise.resolve();

describe('smoke test of the deployed site', () => {
  it('waits longer each time, up to a limit', () => {
    expect(backoffDelays(6, 2000, 10_000)).toEqual([2000, 4000, 8000, 10_000, 10_000]);
    expect(backoffDelays(1, 2000, 10_000)).toEqual([]);
  });

  it('retries only what can come right by itself', () => {
    expect([429, 502, 503, 504].every(isTransient)).toBe(true);
    expect([200, 404, 500].some(isTransient)).toBe(false);
  });

  it('gets past a CDN 503 and a network error', async () => {
    const { fetchImpl, urls } = scripted([503, new Error('ECONNRESET'), 200]);
    const response = await fetchWithRetry('https://example.test/', { fetchImpl, wait: noWait });
    expect(response.status).toBe(200);
    expect(urls).toHaveLength(3);
  });

  it('returns a 404 at once instead of retrying it', async () => {
    const { fetchImpl, urls } = scripted([404]);
    expect(
      (await fetchWithRetry('https://example.test/x', { fetchImpl, wait: noWait })).status,
    ).toBe(404);
    expect(urls).toHaveLength(1);
  });

  it('gives up after its tries and lists what happened each time', async () => {
    const { fetchImpl } = scripted([503]);
    await expect(
      fetchWithRetry('https://example.test/', { fetchImpl, wait: noWait, attempts: 3 }),
    ).rejects.toThrow(
      /didn't answer after 3 tries:\n {2}- HTTP 503\n {2}- HTTP 503\n {2}- HTTP 503/,
    );
  });

  it('finds the entry script and every linked asset in index.html', () => {
    const html =
      '<link rel="icon" href="/campuskit/favicon.svg"><script type="module" crossorigin src="/campuskit/assets/index-i3mSqvYD.js"></script>' +
      '<link rel="modulepreload" href="/campuskit/assets/chunk-a1.js"><link rel="stylesheet" href="/campuskit/assets/index-x.css">';
    expect(entryScript(html)).toBe('assets/index-i3mSqvYD.js');
    expect(linkedAssets(html, 'https://u.github.io/campuskit/')).toEqual([
      'https://u.github.io/campuskit/favicon.svg',
      'https://u.github.io/campuskit/assets/index-i3mSqvYD.js',
      'https://u.github.io/campuskit/assets/chunk-a1.js',
      'https://u.github.io/campuskit/assets/index-x.css',
    ]);
    expect(entryScript('<p>no app</p>')).toBeNull();
  });

  it('waits until the site serves the new build, asking past caches each time', async () => {
    const old = '<script src="/assets/index-old.js"></script>';
    const fresh = '<script src="/assets/index-new.js"></script>';
    const { fetchImpl, urls } = scripted([
      { status: 200, body: old },
      { status: 200, body: old },
      { status: 200, body: fresh },
    ]);
    const result = await waitForDeployment(
      'https://u.github.io/campuskit/',
      'assets/index-new.js',
      {
        fetchImpl,
        wait: noWait,
      },
    );
    expect(result.checks).toBe(3);
    expect(new Set(urls).size).toBe(3);
    expect(urls.every((url) => url.includes('?smoke='))).toBe(true);
  });

  it('reports what it saw when the new build never arrives', async () => {
    const { fetchImpl } = scripted([
      { status: 200, body: '<script src="/assets/index-old.js"></script>' },
    ]);
    await expect(
      waitForDeployment('https://u.github.io/campuskit/', 'assets/index-new.js', {
        fetchImpl,
        wait: noWait,
        checks: 2,
      }),
    ).rejects.toThrow(
      /never served the new build \(assets\/index-new\.js\):\n {2}- HTTP 200, serving assets\/index-old\.js/,
    );
  });

  it('checks a downloaded ZIP for one root folder, required files and safe paths', () => {
    const good = [
      'app/',
      'app/README.md',
      'app/GETTING_STARTED.md',
      'app/LICENSE',
      'app/src/main.ts',
    ];
    expect(zipProblems(good, ['README.md', 'LICENSE'])).toEqual([]);
    expect(zipProblems([], ['README.md'])).toEqual(['the ZIP is empty']);
    expect(zipProblems(['a/README.md', 'b/LICENSE'], [])).toEqual([
      'expected one root folder, found a, b',
    ]);
    expect(zipProblems(['app/README.md', 'app/../evil.sh'], ['README.md', 'LICENSE'])).toEqual([
      'LICENSE is missing',
      'unsafe path app/../evil.sh',
    ]);
  });

  it('writes a job summary that marks failures and escapes table cells', () => {
    const table = summaryTable('https://u.github.io/campuskit/', [
      { name: 'Home page', ok: true, detail: 'shows “CampusKit”' },
      { name: 'ZIP', ok: false, detail: 'a | b\nc' },
    ]);
    expect(table).toContain('**1 of 2 checks failed.**');
    expect(table).toContain('| ZIP | **Failed** | a \\| b c |');
  });
});
