import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
