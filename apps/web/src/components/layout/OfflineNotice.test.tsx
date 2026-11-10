import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OfflineNotice } from './OfflineNotice.tsx';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('offline notice', () => {
  it('appears offline and clears when the connection returns, even without an online event', () => {
    vi.useFakeTimers();
    let online = false;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    render(<OfflineNotice />);
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();

    // Back online, but no `online` event (as Firefox does for a page it loaded offline).
    online = true;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();
  });

  it('follows online and offline events', () => {
    let online = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    render(<OfflineNotice />);
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();
    online = false;
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();
  });
});
