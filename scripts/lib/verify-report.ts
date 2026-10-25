/**
 * How `pnpm verify:generated` reports in GitHub Actions. Job logs need a
 * signed-in account with access to the repository, but annotations and the
 * job summary are shown on the run page, so each failure is written there too.
 *
 * Workflow commands: https://docs.github.com/actions/reference/workflow-commands-for-github-actions
 */

export interface VerifyResult {
  template: string;
  variant: 'defaults' | 'customized';
  ok: boolean;
  /** The steps that passed, in order. */
  steps: string[];
  failure?: string;
}

/** Escapes the message of a workflow command. */
export function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Escapes a property (such as `title`) of a workflow command, which also ends at `:` or `,`. */
export function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/** An error annotation; long messages are cut, since the run page shows only the start. */
export function errorAnnotation(title: string, message: string, maxLength = 4000): string {
  return `::error title=${escapeProperty(title)}::${escapeData(message.slice(0, maxLength))}`;
}

/** A Markdown code block that the text can't end early, whatever backticks it contains. */
export function codeBlock(text: string, language = 'text'): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${text}\n${fence}`;
}

/** The job summary: one table row per generated project, then the output of each failure. */
export function jobSummary(results: VerifyResult[], platform: string, nodeVersion: string): string {
  const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  return [
    `## Generated projects on ${platform} (Node ${nodeVersion})`,
    '',
    '| Template | Variant | Result | Steps that passed |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${cell(result.template)} | ${result.variant} | ${result.ok ? 'passed' : '**failed**'} | ${cell(result.steps.join('; '))} |`,
    ),
    '',
    ...results
      .filter((result) => result.failure)
      .map(
        (result) =>
          `### ${result.template} (${result.variant})\n\n${codeBlock((result.failure ?? '').slice(-6000))}\n`,
      ),
  ].join('\n');
}
