import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

describe('source browser', () => {
  it('highlights the line where a linked function is defined', async () => {
    renderRoute(
      '/projects/attendance-system/source?file=src%2Flib%2Fattendance.ts&symbol=attendancePercentage',
    );
    const status = await screen.findByText(/is defined on line/);
    expect(status).toHaveTextContent(
      /attendancePercentage is defined on line \d+, highlighted below\./,
    );
  });

  it('says when a name is not defined in the file', async () => {
    renderRoute(
      '/projects/attendance-system/source?file=src%2Flib%2Fattendance.ts&symbol=noSuchThing',
    );
    expect(await screen.findByText(/isn’t defined in this file/)).toBeInTheDocument();
  });
});
