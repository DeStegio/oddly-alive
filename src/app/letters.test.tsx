import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LETTERS, LETTER_IDS } from '../content/letters';
import { Trunk } from '../rooms/Attic/Trunk';
import Attic from '../rooms/Attic/Attic';
import { RooftopParty } from '../rooms/AfterHours/RooftopParty';
import MoodRoom from '../rooms/MoodRoom/MoodRoom';
import { useKeepsakes } from '../state/keepsakes';
import { useObjects } from '../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../state/worldStore';
import { allLettersFound, findLetter } from './letters';
import { getWorld } from './worldInstance';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

describe('Great-Aunt Pim’s letters', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });

  it('there is one per room, each with a hint, a body and a sign-off in her voice', () => {
    expect(LETTERS).toHaveLength(8);
    expect(new Set(LETTER_IDS).size).toBe(8);
    for (const l of LETTERS) {
      expect(l.hint.length).toBeGreaterThan(10);
      expect(l.body.join(' ').split(/\s+/).length).toBeGreaterThan(40);
      expect(l.signoff).toMatch(/P\.|Pim/);
    }
    // a different sign-off every time
    expect(new Set(LETTERS.map((l) => l.signoff)).size).toBe(8);
  });

  it('a letter is found once, noted in the diary and announced', () => {
    const world = getWorld();
    expect(findLetter(world, 'living')).toBe(true);
    expect(findLetter(world, 'living')).toBe(false);
    expect(findLetter(world, 'kitchen')).toBe(false);
    expect(useKeepsakes.getState().letters).toEqual(['living']);
    expect(getWorldState().lastLetter?.id).toBe('living');
    expect(getWorldState().discoveries.correspondent).toBeDefined();
    expect(useKeepsakes.getState().diary.some((e) => /behind the portrait/.test(e.detail))).toBe(true);
  });

  it('all eight tell the whole story', () => {
    const world = getWorld();
    for (const id of LETTER_IDS) findLetter(world, id);
    expect(allLettersFound(useKeepsakes.getState().letters)).toBe(true);
    expect(getWorldState().discoveries['whole-story']).toBeDefined();
  });

  it('the trunk reads found letters and hints at the missing ones', () => {
    findLetter(getWorld(), 'garden');
    wrap(<Trunk />);
    expect(screen.getByText(/1 of 8 letters/)).toBeInTheDocument();
    expect(screen.getByText(/Join up some stars on the roof/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Garden/ }));
    expect(screen.getByRole('article')).toHaveTextContent('Moonflowers were my favourite');
    expect(screen.getByRole('article')).toHaveTextContent('Muddy knees, P.');
  });

  it('the attic has one under the dust on the floor', () => {
    wrap(<Attic />);
    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole('button', { name: 'Dust the next thing' }));
    expect(useKeepsakes.getState().letters).toContain('attic');
  });

  it('the mirror hands one over while the rainbow is out', () => {
    setWorldState({ weather: 'rainbow' });
    wrap(<MoodRoom />);
    fireEvent.click(screen.getByRole('button', { name: /mirror/ }));
    expect(useKeepsakes.getState().letters).toContain('mood');
  });

  it('the finale: everyone on the roof, and a last discovery', () => {
    act(() => {
      wrap(<RooftopParty />);
    });
    expect(screen.getByRole('img', { name: /Everyone in the house is up on the roof/ })).toBeInTheDocument();
    expect(getWorldState().discoveries['family-reunion']).toBeDefined();
  });
});
