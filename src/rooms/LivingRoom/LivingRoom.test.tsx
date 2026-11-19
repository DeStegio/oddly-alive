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

  it('the button label evolves with presses (INT-016)', () => {
    renderRoom();
    const btn = () => screen.getByRole('button', { name: /pressed \d+ times/ });
    fireEvent.click(btn());
    fireEvent.click(btn());
    expect(btn()).toHaveAccessibleName(/i said no/);
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
