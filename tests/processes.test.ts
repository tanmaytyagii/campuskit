import { spawn } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import {
  hasEnded,
  keepOutput,
  outputNote,
  stopProcess,
  waitForHealth,
} from '../scripts/lib/processes.ts';

/** A Node.js process running `code`, with its output piped like the verifier's app processes. */
function node(code: string) {
  return spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function exited(child: ReturnType<typeof node>): Promise<void> {
  return new Promise((done) => {
    if (hasEnded(child)) done();
    else child.once('exit', () => done());
  });
}

describe('child processes in pnpm verify:generated', () => {
  it('keeps only the end of what a process prints, from stdout and stderr', async () => {
    const child = node(
      'process.stdout.write("a".repeat(5000)); process.stderr.write("Traceback: port in use ✓")',
    );
    const output = keepOutput(child, 100);
    await output.closed;
    expect(output.text()).toHaveLength(100);
    expect(output.text()).toMatch(/Traceback: port in use ✓$/);
  });

  it('stops a process that is still running and waits until it has exited', async () => {
    const child = node('setInterval(() => {}, 1000)');
    await new Promise((done) => child.once('spawn', done));
    expect(hasEnded(child)).toBe(false);
    await stopProcess(child, 10_000);
    expect(hasEnded(child)).toBe(true);
  });

  it('returns at once for a process that has already exited', async () => {
    const child = node('');
    await exited(child);
    const started = Date.now();
    await stopProcess(child, 10_000);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  // A crashed app has a signal but no exit code; the health check once waited out its whole
  // timeout for one.
  it.skipIf(process.platform === 'win32')(
    'counts a process ended by a signal as ended',
    async () => {
      const child = node('setInterval(() => {}, 1000)');
      await new Promise((done) => child.once('spawn', done));
      child.kill('SIGKILL');
      await exited(child);
      expect(child.exitCode).toBeNull();
      expect(hasEnded(child)).toBe(true);
    },
  );

  describe('the health check', () => {
    async function closedPort(): Promise<number> {
      const server = createServer();
      await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
      const { port } = server.address() as AddressInfo;
      await new Promise((done) => server.close(done));
      return port;
    }

    it('says why an app that keeps running never answered, with the end of its output', async () => {
      const port = await closedPort();
      const app = node(
        'console.error("OSError: [Errno 98] Address already in use"); setInterval(() => {}, 1000)',
      );
      const output = keepOutput(app);
      try {
        await expect(
          waitForHealth(`http://127.0.0.1:${port}/_stcore/health`, app, 1500, output),
        ).rejects.toThrow(
          /did not answer within 1\.5 seconds\nIts output ended with:\nOSError: \[Errno 98\] Address already in use/,
        );
      } finally {
        await stopProcess(app);
      }
    });

    it('stops waiting as soon as the app exits, with its exit code and output', async () => {
      const port = await closedPort();
      const app = node(
        'console.error("ModuleNotFoundError: No module named streamlit"); process.exit(3)',
      );
      const output = keepOutput(app);
      const started = Date.now();
      await expect(
        waitForHealth(`http://127.0.0.1:${port}/_stcore/health`, app, 60_000, output),
      ).rejects.toThrow(
        /^The app stopped \(exit code 3\) before it was ready\nIts output ended with:\nModuleNotFoundError/,
      );
      expect(Date.now() - started).toBeLessThan(10_000);
    });

    it('gives up on a server that accepts connections but never answers', async () => {
      const app = node(
        'require("node:http").createServer(() => {}).listen(0, "127.0.0.1", function () { console.log(this.address().port); })',
      );
      const output = keepOutput(app);
      try {
        await expect.poll(() => output.text().trim()).toMatch(/^\d+$/);
        const started = Date.now();
        await expect(
          waitForHealth(`http://127.0.0.1:${output.text().trim()}/`, app, 1500, output),
        ).rejects.toThrow(/did not answer within 1\.5 seconds/);
        // One try's own limit (5 s) past the deadline at most, not the 5 minutes fetch waits.
        expect(Date.now() - started).toBeLessThan(15_000);
      } finally {
        await stopProcess(app);
      }
    });

    it('returns once the app answers', async () => {
      const app = node(
        'require("node:http").createServer((_, res) => res.end("ok")).listen(0, "127.0.0.1", function () { console.log(this.address().port); })',
      );
      const output = keepOutput(app);
      try {
        await expect.poll(() => output.text().trim()).toMatch(/^\d+$/);
        await waitForHealth(`http://127.0.0.1:${output.text().trim()}/`, app, 10_000, output);
      } finally {
        await stopProcess(app);
      }
    });
  });

  it('says when a process printed nothing, so an empty error message is not a mystery', () => {
    expect(outputNote('  \n')).toBe('\nIt printed nothing.');
    expect(outputNote('\nError: address in use\n')).toBe(
      '\nIts output ended with:\nError: address in use',
    );
  });
});
