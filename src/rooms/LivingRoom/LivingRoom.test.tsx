import { useButton } from './button/buttonStore';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import LivingRoom from './LivingRoom';

function renderRoom() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LivingRoom />
    </MemoryRouter>,
  );
}

describe('<LivingRoom />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
  });

  it('exposes every interactive prop as an accessible button', () => {
    renderRoom();
    for (const name of [/Pim/, /Dot/, /Lumen/, /Tick/, /Ferdinand/, /Great-Aunt Pim/, /do not press/, /dust bunny/, /floorboard/]) {
      expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'Door to the Playground' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Oddly Alive' })).toBeInTheDocument();
  });

  it('the lamp switches and reports its state', () => {
    renderRoom();
    const lamp = screen.getByRole('button', { name: /Lumen/ });
    expect(lamp).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(lamp);
    expect(screen.getByRole('button', { name: /Lumen/ })).toHaveAttribute('aria-pressed', 'false');
    expect(getWorldState().counts.lumen).toBe(1);
  });

  it('the button fights back: impatient presses bring up the glass, and the glass takes the presses (INT-016)', () => {
    useButton.getState().reset();
    renderRoom();
    const btn = () => screen.getByRole('button', { name: /pressed \d+ times/ });
    fireEvent.click(btn());
    expect(btn()).toHaveAccessibleName(/do not press \(pressed 1 times\)/);
    // a wary button sometimes ducks, so keep going until the glass comes up
    for (let i = 0; i < 6 && !/behind glass/.test(btn().getAttribute('aria-label') ?? ''); i++) fireEvent.click(btn());
    expect(btn()).toHaveAccessibleName(/i said no.*behind glass/);
    const count = btn().getAttribute('aria-label')!.match(/pressed (\d+) times/)![1];
    // pressing through the glass doesn't count
    fireEvent.click(btn());
    expect(btn()).toHaveAccessibleName(new RegExp(`pressed ${count} times`));
  });

  it('keyboard activation of a character is recorded as keyboard input', () => {
    renderRoom();
    const pim = screen.getByRole('button', { name: /Pim, a shy blob/ });
    act(() => {
      fireEvent.click(pim, { detail: 0 });
    });
    expect(getWorldState().counts.pim).toBe(1);
  });
});
