import { fireEvent, render, screen } from '@testing-library/react';
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

  it('keyboard: choose a seed, plant it, pick it when ripe; radishes go to the Playground', () => {
    useKeepsakes.getState().setPlot(1, { kind: 'radish', plantedAt: Date.now(), updatedAt: Date.now(), wateredAt: 0, growth: 1 });
    renderGarden();
    expect(screen.getAllByRole('button', { name: /empty/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Sunflower seeds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plot 1: empty' }));
    expect(screen.getByRole('button', { name: /Plot 1: sunflower, just planted/ })).toBeInTheDocument();
    expect(useKeepsakes.getState().garden.plots[0]?.kind).toBe('sunflower');

    // not ripe: nothing happens to it
    fireEvent.click(screen.getByRole('button', { name: /Plot 1: sunflower/ }));
    expect(useKeepsakes.getState().garden.plots[0]?.kind).toBe('sunflower');

    fireEvent.click(screen.getByRole('button', { name: /Plot 2: radish, in bloom \(ready to pick\)/ }));
    expect(useObjects.getState().playground.radishes).toBe(1);
    expect(useKeepsakes.getState().garden.plots[1]).toBeNull();
  });

  it('the sun has keyboard controls', () => {
    renderGarden();
    expect(screen.getByRole('slider', { name: /Sun, across the garden/ })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /Sun height/ })).toBeInTheDocument();
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
