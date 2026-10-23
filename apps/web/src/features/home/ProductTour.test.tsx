import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ProductTour } from './ProductTour.tsx';

function renderTour() {
  return render(
    <MemoryRouter>
      <ProductTour />
    </MemoryRouter>,
  );
}

describe('product tour', () => {
  it('shows one labelled screenshot per feature', async () => {
    const user = userEvent.setup();
    renderTour();
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAccessibleName('Discover');
    expect(within(panel).getByRole('img')).toHaveAccessibleName(
      'The project gallery with filters, a search box and project cards',
    );
    expect(within(panel).getByRole('link', { name: 'Browse the projects' })).toHaveAttribute(
      'href',
      '/projects',
    );

    await user.click(screen.getByRole('tab', { name: 'Practise' }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Practise');
    expect(screen.getByRole('heading', { name: 'Rehearse your viva' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise viva questions' })).toHaveAttribute(
      'href',
      '/viva',
    );
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    const user = userEvent.setup();
    renderTour();
    const tabs = within(screen.getByRole('tablist', { name: 'CampusKit features' }));
    const discover = tabs.getByRole('tab', { name: 'Discover' });
    const customize = tabs.getByRole('tab', { name: 'Customize' });
    const compare = tabs.getByRole('tab', { name: 'Compare' });

    // Only the selected tab is in the tab order.
    expect(discover).toHaveAttribute('tabindex', '0');
    expect(customize).toHaveAttribute('tabindex', '-1');

    await user.tab();
    expect(discover).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(customize).toHaveFocus();
    expect(customize).toHaveAttribute('aria-selected', 'true');
    expect(discover).toHaveAttribute('aria-selected', 'false');
    expect(
      screen.getByRole('heading', { name: 'Make it yours before you download' }),
    ).toBeInTheDocument();

    // Arrow keys wrap around at either end.
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(compare).toHaveFocus();
    expect(compare).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(discover).toHaveFocus();

    await user.keyboard('{End}');
    expect(compare).toHaveFocus();
    await user.keyboard('{Home}');
    expect(discover).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Discover');
  });
});
