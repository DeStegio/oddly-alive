import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { diaryDate } from '../../content/attic';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import Attic, { SETTLE_MS } from './Attic';

/**
 * The attic by keyboard: uncover act 1 with "Dust the next thing", pin the
 * five things on the Memory Board, and watch the first memories lock in.
 * Replaces the Phase 3 tests (digits on photos, a three-number lock, hats on
 * a wheel), which covered behaviour that no longer exists.
 */
describe('<Attic />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  const renderAttic = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Attic />
      </MemoryRouter>,
    );
  const settle = () =>
    act(() => {
      vi.advanceTimersByTime(SETTLE_MS + 50);
    });
  const dustAll = (n: number) => {
    for (let i = 0; i < n; i++) fireEvent.click(screen.getByRole('button', { name: 'Dust the next thing' }));
  };
  const pinThing = (name: RegExp, owner: string, laterPresses: number) => {
    const card = screen.getAllByRole('listitem').find((li) => within(li).queryByText(name))!;
    fireEvent.click(within(card).getByRole('radio', { name: owner }));
    for (let i = 0; i < laterPresses; i++) fireEvent.click(within(card).getByRole('button', { name: 'Later' }));
    settle();
  };

  it('finding the attic is a discovery; Marguerite asks who she was wearing', () => {
    renderAttic();
    expect(getWorldState().discoveries.attic).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText(/Who was I wearing/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Memory Board/ })).toBeInTheDocument();
  });

  it('act 1 by keyboard: uncover, pin, and the board locks in groups of three', () => {
    renderAttic();
    dustAll(16);
    // names come with the evidence
    expect(screen.getAllByText('Odile Marchetti').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Walter Pryce').length).toBeGreaterThan(0);
    expect(useKeepsakes.getState().letters).toContain('attic');

    pinThing(/^Hat block$/, 'Odile Marchetti', 1); // 1920s
    pinThing(/^Tin of feathers$/, 'Odile Marchetti', 2); // 1930s
    expect(useKeepsakes.getState().board.locked).toEqual([]);
    pinThing(/^Wireless valve$/, 'Walter Pryce', 4); // a wrong decade (1950s)
    expect(useKeepsakes.getState().board.locked).toEqual([]); // nothing says which
    pinThing(/^Wrist pin cushion$/, 'Odile Marchetti', 1);
    expect(useKeepsakes.getState().board.locked).toEqual(['hat-block', 'feather-tin', 'pin-cushion']);
    expect(getWorldState().discoveries['memory-lane']).toBeDefined();
    // fix the valve, pin the headphones: the last two finish act 1
    const valve = screen.getAllByRole('listitem').find((li) => within(li).queryByText(/^Wireless valve$/))!;
    fireEvent.click(within(valve).getByRole('button', { name: 'Earlier' }));
    settle();
    pinThing(/^Headphones$/, 'Walter Pryce', 4);
    expect(useKeepsakes.getState().board.locked).toHaveLength(5);
    expect(useKeepsakes.getState().board.act).toBe(2);
  });

  it('diary dates read like a person wrote them', () => {
    const now = new Date(2024, 4, 15, 15, 0).getTime();
    expect(diaryDate(new Date(2024, 4, 15, 10, 0).getTime(), now)).toBe('today, late morning');
    expect(diaryDate(new Date(2024, 4, 14, 20, 0).getTime(), now)).toBe('yesterday, evening');
  });
});
