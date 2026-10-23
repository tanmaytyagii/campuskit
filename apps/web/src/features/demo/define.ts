import { createElement, type ReactNode } from 'react';

import type { DemoImplementation, DemoViewProps, StepCheck } from './types.ts';

/**
 * A demo implementation with its state type erased, so the studio can host
 * every demo the same way. The state passed back in always came from the
 * same implementation's `createState` or `readState`.
 */
export interface LoadedDemo {
  createState: () => unknown;
  createEmptyState: (() => unknown) | null;
  /** The stored value as demo state, or null when it can't be used. */
  readState: (value: unknown) => { state: unknown } | null;
  render: (props: DemoViewProps<unknown>) => ReactNode;
  /** null when the step has no action to check. */
  check: (stepId: string, state: unknown, start: unknown) => StepCheck | null;
  describe: (state: unknown) => string;
}

export function defineDemo<State>(implementation: DemoImplementation<State>): LoadedDemo {
  const { createEmptyState } = implementation;
  return {
    createState: implementation.createState,
    createEmptyState: createEmptyState ?? null,
    readState: (value) => {
      const state = implementation.readState(value);
      return state === null ? null : { state };
    },
    render: (props) =>
      createElement(implementation.View, props as unknown as DemoViewProps<State>),
    check: (stepId, state, start) => {
      const check = implementation.checks[stepId];
      return check ? check(state as State, start as State) : null;
    },
    describe: (state) => implementation.describe(state as State),
  };
}
