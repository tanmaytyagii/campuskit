import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DemoFrame } from './DemoFrame.tsx';
import { attendanceDemo } from './demos/attendance/definition.ts';

describe('demo frame tabs', () => {
  it('move from the focused tab even before the selected screen catches up', async () => {
    const user = userEvent.setup();
    const onFeatureChange = vi.fn();
    // The selected screen comes from the address. Here it never changes, as when a
    // navigation is still pending and the student presses the next key.
    render(
      <DemoFrame
        definition={attendanceDemo}
        feature="students"
        onFeatureChange={onFeatureChange}
        feedback={null}
        status="12 students"
      >
        <p>Screen</p>
      </DemoFrame>,
    );
    act(() => screen.getByRole('tab', { name: 'Students' }).focus());

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Mark attendance' })).toHaveFocus();
    expect(onFeatureChange).toHaveBeenLastCalledWith('mark');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveFocus();
    expect(onFeatureChange).toHaveBeenLastCalledWith('summary');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Mark attendance' })).toHaveFocus();
    expect(onFeatureChange).toHaveBeenLastCalledWith('mark');
  });
});
