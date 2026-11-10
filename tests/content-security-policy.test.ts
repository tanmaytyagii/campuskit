import { describe, expect, it } from 'vitest';

import { buildPolicy } from '../apps/web/vite-plugins/content-security-policy.ts';

describe('content security policy', () => {
  const policy = buildPolicy(['console.log(1)']);
  const directive = (name: string) =>
    policy
      .split('; ')
      .find((part) => part.startsWith(`${name} `))
      ?.split(' ')
      .slice(1);

  it('allows connections only to the site and, for the optional AI assistant, Anthropic’s API', () => {
    expect(directive('connect-src')).toEqual(["'self'", 'https://api.anthropic.com']);
  });

  it('allows scripts only from the site and the hashed inline script', () => {
    expect(directive('script-src')).toEqual(["'self'", expect.stringMatching(/^'sha256-.+'$/)]);
    expect(directive('object-src')).toEqual(["'none'"]);
  });
});
