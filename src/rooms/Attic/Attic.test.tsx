import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('boxes give up hats; Marguerite wears all four for a discovery', () => {
    wrap(<Attic />);
    for (const label of [/marked XMAS/, /broken clasp/, /theatre ticket/, /paint tins/]) fireEvent.click(screen.getByRole('button', { name: label }));
    expect(useKeepsakes.getState().attic.hats.sort()).toEqual(['beret', 'crown', 'sunhat', 'topper']);
    fireEvent.click(screen.getByRole('button', { name: /shoebox/ }));
    expect(screen.getByText(/Tick says it walked off/)).toBeInTheDocument();
    const hats = within(screen.getByRole('group', { name: 'Hats to try on her' }));
    for (const hat of [/beret/, /top hat/, /sun hat/, /paper crown/]) fireEvent.click(hats.getByRole('button', { name: hat }));
    expect(screen.getByRole('button', { name: /Marguerite the dress form, wearing a paper crown/ })).toBeInTheDocument();
    expect(getWorldState().discoveries['dress-rehearsal']).toBeDefined();
  });

  it('the diary reads back the visit; the gramophone plays', () => {
    for (let i = 0; i < 6; i++) useKeepsakes.getState().note(`n${i}`, `Thing number ${i + 1} happened.`);
    wrap(<Attic />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the house diary' }));
    expect(screen.getByText(/Thing number 6 happened/)).toBeInTheDocument();
    expect(getWorldState().discoveries['dear-diary']).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '← earlier' }));
    expect(screen.getByText(/Thing number 1 happened/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Put the needle down/ }));
    expect(getWorldState().discoveries['needle-drop']).toBeDefined();
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
