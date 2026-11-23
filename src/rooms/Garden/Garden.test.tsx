import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { initialWorldState, setWorldState } from '../../state/worldStore';
import Garden, { resetGardenSession } from './Garden';

/**
 * The garden by keyboard only (the same path a screen-reader user takes):
 * pick a seed, plant it, move the sun with the arrows, let days go with
 * Enter, take a day back. Covers the old behaviour that was replaced
 * (glyph planting, swipe-to-pick) with the Phase 4 puzzle box.
 */
describe('<Garden />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
    resetGardenSession();
  });

  const renderGarden = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Garden />
      </MemoryRouter>,
    );

  it('opens on the first job with someone already asking, and the play area ready', () => {
    renderGarden();
    expect(screen.getByRole('heading', { name: 'Garden' })).toBeInTheDocument();
    expect(screen.getByText(/look at me\. at the house/)).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(28);
    expect(screen.getByRole('slider', { name: /The sun/ })).toHaveAttribute('aria-valuetext', 'noon sun (high)');
    // no rules printed: no card of shapes, no instructions paragraph
    expect(screen.queryByText(/Draw it in the soil/)).toBeNull();
  });

  it('job 1 by keyboard: plant a sunflower, two noons, then an evening: it faces the house', () => {
    renderGarden();
    fireEvent.click(screen.getByRole('button', { name: /Sunflower seeds, 1 left/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^4, 2: empty soil/ }));
    expect(screen.getByRole('gridcell', { name: /^4, 2: sunflower, a seed/ })).toBeInTheDocument();
    const sun = screen.getByRole('slider', { name: /The sun/ });
    act(() => {
      fireEvent.keyDown(sun, { key: 'Enter' });
    });
    act(() => {
      fireEvent.keyDown(sun, { key: 'Enter' });
    });
    expect(screen.getByRole('gridcell', { name: /^4, 2: sunflower, grown, facing south/ })).toBeInTheDocument();
    fireEvent.keyDown(sun, { key: 'ArrowLeft' });
    expect(sun).toHaveAttribute('aria-valuetext', 'evening sun (west, low)');
    act(() => {
      fireEvent.keyDown(sun, { key: 'Enter' });
    });
    expect(screen.getByRole('gridcell', { name: /^4, 2: sunflower, in bloom, facing west/ })).toBeInTheDocument();
    expect(useKeepsakes.getState().garden2.solved).toContain('facing');
    expect(screen.getByRole('button', { name: /next job/ })).toBeInTheDocument();
    expect(useKeepsakes.getState().garden2.herbarium).toContain('sun-face');
  });

  it('a wrong answer is cheap: take the sun back and the bed is exactly as it was', () => {
    renderGarden();
    fireEvent.click(screen.getByRole('button', { name: /Sunflower seeds/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^2, 2: empty soil/ }));
    const sun = screen.getByRole('slider', { name: /The sun/ });
    for (let i = 0; i < 4; i++)
      act(() => {
        fireEvent.keyDown(sun, { key: 'Enter' });
      });
    expect(screen.getByText(/looking somewhere else/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Take the sun back one day/ }));
    expect(screen.getByRole('gridcell', { name: /^2, 2: sunflower, in bloom, facing south/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Go back to the start of day 1/ }));
    expect(screen.getByRole('gridcell', { name: /^2, 2: sunflower, a seed/ })).toBeInTheDocument();
  });

  it('a seed planted today digs back up into the tin', () => {
    renderGarden();
    fireEvent.click(screen.getByRole('button', { name: /Sunflower seeds, 1 left/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^1, 1: empty soil/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^1, 1: sunflower/ }));
    expect(screen.getByRole('button', { name: /Sunflower seeds, 1 left/ })).toBeInTheDocument();
  });

  it('free play is always there: the whole tin, no job', () => {
    renderGarden();
    fireEvent.click(screen.getByRole('button', { name: /Free play/ }));
    expect(screen.getByRole('button', { name: /Moonflower seeds, 9 left/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creeper seeds/ })).toBeInTheDocument();
  });
});
