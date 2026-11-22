import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { diaryDate } from '../../content/attic';
import { PullCord } from '../LivingRoom/PullCord';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import Attic from './Attic';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

describe('<Attic />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });

  it('finding it unlocks it for good and counts as a discovery', () => {
    wrap(<Attic />);
    expect(useKeepsakes.getState().attic.unlocked).toBe(true);
    expect(getWorldState().discoveries.attic).toBeDefined();
  });

  it('keyboard: dusting uncovers the hats, the letter, and the trunk; the lock takes the numbers from the photos', () => {
    wrap(<Attic />);
    const dustNext = screen.getByRole('button', { name: 'Dust the next thing' });
    for (let i = 0; i < 12; i++) fireEvent.click(dustNext);
    expect(useObjects.getState().attic.dust.split(',')).toHaveLength(12);
    expect([...useKeepsakes.getState().attic.hats].sort()).toEqual(['beret', 'crown', 'sunhat', 'topper']);
    expect(useKeepsakes.getState().letters).toContain('attic');

    // 4, 7, 2: one number from each photograph
    const dials = screen.getAllByRole('spinbutton');
    [4, 7, 2].forEach((n, i) => {
      for (let k = 0; k < n; k++) fireEvent.keyDown(dials[i]!, { key: 'ArrowUp' });
    });
    expect(useObjects.getState().attic.opened.split(',')).toContain('trunk');
    expect(getWorldState().discoveries.combination).toBeDefined();
    expect(screen.getByRole('heading', { name: /trunk/ })).toBeInTheDocument();
  });

  it('Marguerite changes hats with the arrow keys, and wears every hat for a discovery', () => {
    for (const h of ['beret', 'topper', 'sunhat', 'crown']) useKeepsakes.getState().addHat(h);
    useObjects.getState().setSlice('attic', { dust: 'marguerite' });
    wrap(<Attic />);
    const m = screen.getByRole('button', { name: /Marguerite the dress form/ });
    for (let i = 0; i < 4; i++) fireEvent.keyDown(m, { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: /wearing a paper crown/ })).toBeInTheDocument();
    expect(getWorldState().discoveries['dress-rehearsal']).toBeDefined();
    fireEvent.keyDown(m, { key: 'ArrowUp' });
    expect(useObjects.getState().attic.wearing).toBe('');
  });

  it('the diary reads back the visit; pages turn', () => {
    for (let i = 0; i < 6; i++) useKeepsakes.getState().note(`n${i}`, `Thing number ${i + 1} happened.`);
    useObjects.getState().setSlice('attic', { dust: 'diary' });
    wrap(<Attic />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the house diary' }));
    expect(screen.getByText(/Thing number 6 happened/)).toBeInTheDocument();
    expect(getWorldState().discoveries['dear-diary']).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '← earlier' }));
    expect(screen.getByText(/Thing number 1 happened/)).toBeInTheDocument();
  });

  it('diary dates read like a person wrote them', () => {
    const now = new Date(2026, 10, 20, 18, 30).getTime();
    expect(diaryDate(new Date(2026, 10, 20, 10, 0).getTime(), now)).toBe('today, late morning');
    expect(diaryDate(new Date(2026, 10, 19, 20, 0).getTime(), now)).toBe('yesterday, evening');
  });
});

describe('<PullCord />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useKeepsakes.getState().reset();
  });

  it('appears after three discoveries and brings the ladder down', () => {
    const { rerender } = wrap(<PullCord />);
    expect(screen.queryByRole('button', { name: /cord/ })).toBeNull();
    setWorldState({ discoveries: { a: 1, b: 2, c: 3 } });
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PullCord />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /cord hanging from the ceiling/ }));
    expect(useKeepsakes.getState().attic.unlocked).toBe(true);
    expect(screen.getByRole('link', { name: 'Up to the attic' })).toHaveAttribute('href', '/attic');
  });
});
