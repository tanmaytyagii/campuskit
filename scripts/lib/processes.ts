/**
 * Long-running child processes for `pnpm verify:generated`: keeping the end of what they print,
 * for error messages, and stopping them the same way on every system.
 */
import { spawn, type ChildProcess } from 'node:child_process';

export interface KeptOutput {
  /** The last characters printed so far. */
  text: () => string;
  /** Settles once the process's output has closed: after it exits, the rest can still arrive. */
  closed: Promise<void>;
}

/**
 * Keeps the last `limit` characters a child process writes to stdout and stderr. Reading the
 * output also stops a process that prints a lot from blocking on a full pipe.
 */
export function keepOutput(child: ChildProcess, limit = 4000): KeptOutput {
  let output = '';
  const closed = new Promise<void>((done) => child.once('close', () => done()));
  for (const stream of [child.stdout, child.stderr]) {
    stream?.setEncoding('utf8');
    stream?.on('data', (chunk: string) => {
      output = (output + chunk).slice(-limit);
    });
  }
  return { text: () => output, closed };
}

/** Whether a child process has ended, by exiting or by a signal. */
export function hasEnded(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

/**
 * Stops a long-running child process and any process it started, then waits until it has
 * exited, for at most `timeoutMs`.
 *
 * On Windows, a virtual environment's python.exe is a launcher that runs the real interpreter
 * as its own child process, and files stay locked until every process is gone. So the whole
 * process tree is stopped with taskkill. On other systems the process gets SIGTERM.
 */
export function stopProcess(
  child: ChildProcess,
  timeoutMs = 15_000,
  platform: NodeJS.Platform = process.platform,
): Promise<void> {
  if (hasEnded(child)) return Promise.resolve();
  return new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
    if (platform === 'win32' && child.pid !== undefined) {
      const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      taskkill.once('error', () => child.kill());
    } else {
      child.kill();
    }
  });
}

/** The end of a process's output, for an error message. */
export function outputNote(output: string): string {
  const text = output.trim();
  return text ? `\nIts output ended with:\n${text}` : '\nIt printed nothing.';
}

/** An app that stopped, or didn't answer, before it was ready. */
export class NotReadyError extends Error {}

/**
 * Waits until `url` answers with a success status, while the app's process keeps running. The
 * error says why it didn't, with the end of the app's output.
 */
export async function waitForHealth(
  url: string,
  child: ChildProcess,
  timeoutMs: number,
  output: KeptOutput,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (hasEnded(child)) {
      // Not forever: a process the app started can keep its output open.
      await Promise.race([output.closed, new Promise((done) => setTimeout(done, 2000))]);
      const how =
        child.exitCode === null ? `signal ${child.signalCode}` : `exit code ${child.exitCode}`;
      throw new NotReadyError(
        `The app stopped (${how}) before it was ready${outputNote(output.text())}`,
      );
    }
    try {
      // Each try has its own limit: a server that accepts the connection but never answers
      // would otherwise keep the check waiting past the deadline.
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new NotReadyError(
    `${url} did not answer within ${timeoutMs / 1000} seconds${outputNote(output.text())}`,
  );
}

/** A command that couldn't start, failed or ran out of time. */
export class CommandError extends Error {}

export interface CommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  /** Needed on Windows for .cmd scripts such as npm. */
  shell?: boolean;
  /** The command is stopped, with every process it started, after this long. */
  timeoutMs?: number;
}

/** A time limit in words: "15 minutes", "0.5 seconds". */
export function duration(ms: number): string {
  return ms >= 60_000 ? `${ms / 60_000} minutes` : `${ms / 1000} seconds`;
}

/** How a finished process ended, in words. */
export function describeExit(code: number | null, signal: NodeJS.Signals | null): string {
  return code === null
    ? `was stopped by signal ${signal ?? 'unknown'}`
    : `exited with code ${code}`;
}

/**
 * Runs a command to the end and returns everything it printed. A failure says which command,
 * how it ended and how its output ended, so the verification report shows the cause.
 */
export function runCommand(
  command: string,
  commandArgs: string[],
  { cwd, env, shell = false, timeoutMs = 15 * 60_000 }: CommandOptions,
): Promise<string> {
  const shown = [command, ...commandArgs].join(' ');
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell,
    });
    let output = '';
    let timedOut = false;
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    const timer = setTimeout(() => {
      timedOut = true;
      void stopProcess(child);
    }, timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new CommandError(`Could not run "${shown}" in ${cwd}: ${error.message}`));
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) resolvePromise(output);
      else if (timedOut)
        reject(
          new CommandError(
            `"${shown}" did not finish within ${duration(timeoutMs)} and was stopped${outputNote(output.slice(-3000))}`,
          ),
        );
      else
        reject(
          new CommandError(
            `"${shown}" ${describeExit(code, signal)}${outputNote(output.slice(-3000))}`,
          ),
        );
    });
  });
}
