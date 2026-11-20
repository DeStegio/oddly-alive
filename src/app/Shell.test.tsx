import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setWorldState } from '../state/worldStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Shell } from './Shell';

function Boom(): never {
  throw new Error('kaboom');
}

describe('Shell', () => {
  it('renders navigation for all six rooms and a skip link', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Shell>
          <p>scene</p>
        </Shell>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Rooms' });
    expect(nav.querySelectorAll('a')).toHaveLength(6);
    expect(screen.getByText('Skip to the room')).toHaveAttribute('href', '#scene');
    expect(screen.getByText('scene')).toBeInTheDocument();
  });

  it('a mood change mid-visit does not replay the room entrance', () => {
    setWorldState({ mood: 'neutral' });
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Shell>
          <p>scene</p>
        </Shell>
      </MemoryRouter>,
    );
    const entrance = screen.getByText('scene').parentElement!;
    expect(entrance).toHaveAttribute('data-mood', 'neutral');
    act(() => setWorldState({ mood: 'annoyed' }));
    // same element, same entrance animation: no blink after a burst of clicks
    expect(screen.getByText('scene').parentElement).toBe(entrance);
    expect(entrance).toHaveAttribute('data-mood', 'neutral');
  });

  it('error boundary shows an honest recovery screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary label="Playground">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The Playground tripped over itself.');
    spy.mockRestore();
  });
});
