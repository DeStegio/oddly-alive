import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import Garden from './Garden';

const MIN = 60_000;

describe('<Garden />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000_000);
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  const renderGarden = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Garden />
      </MemoryRouter>,
    );

  it('plant, water, wait, bloom, pick: radishes go to the Playground', () => {
    renderGarden();
    expect(screen.getAllByRole('button', { name: /empty/ })).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Radish seeds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plot 1: empty' }));
    expect(screen.getByRole('button', { name: /Plot 1: radish, just planted/ })).toBeInTheDocument();
    expect(useKeepsakes.getState().garden.plots[0]?.kind).toBe('radish');

    // tap with nothing in hand = water
    fireEvent.click(screen.getByRole('button', { name: 'Radish seeds' }));
    fireEvent.click(screen.getByRole('button', { name: /Plot 1: radish/ }));
    expect(useKeepsakes.getState().garden.plots[0]!.wateredAt).toBeGreaterThan(0);

    act(() => void vi.advanceTimersByTime(3.2 * MIN));
    expect(screen.getByRole('button', { name: /Plot 1: radish, in bloom \(ready to pull\)/ })).toBeInTheDocument();
    act(() => void vi.runOnlyPendingTimers());
    expect(getWorldState().discoveries['green-thumb']).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Plot 1: radish, in bloom/ }));
    expect(useObjects.getState().playground.radishes).toBe(1);
    expect(useKeepsakes.getState().garden.plots[0]).toBeNull();
  });

  it('flowers go to the vase; a garden left alone keeps growing', () => {
    useKeepsakes.getState().setPlot(2, { kind: 'mint', plantedAt: Date.now() - 2 * 60 * MIN, updatedAt: Date.now() - 2 * 60 * MIN, wateredAt: 0, growth: 0.1 });
    renderGarden();
    // two hours away at half speed is plenty for mint
    expect(screen.getByRole('button', { name: /Plot 3: mint, in bloom/ })).toBeInTheDocument();
    expect(getWorldState().discoveries['came-back']).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Plot 3: mint/ }));
    expect(useKeepsakes.getState().garden.vase).toEqual(['mint']);
  });
});
