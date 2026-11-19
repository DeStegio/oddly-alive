import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MEMORY_KEY } from '../../engine/memory';
import { initialWorldState, setWorldState } from '../../state/worldStore';
import MemoryRoom from './MemoryRoom';

const renderRoom = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MemoryRoom />
    </MemoryRouter>,
  );

describe('<MemoryRoom />', () => {
  beforeEach(() => {
    localStorage.clear();
    setWorldState({ ...initialWorldState(), visits: 4, pastCounts: { lumen: 12 }, discoveries: { hello: 1 } });
  });

  it('shows the nickname, visits and real interaction counts', () => {
    renderRoom();
    expect(screen.getByText('Returning Lamp Botherer')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 visits' })).toBeInTheDocument();
    expect(screen.getAllByText(/Lumen the lamp/).length).toBeGreaterThan(0);
  });

  it('Forget me asks for confirmation inline, then clears', () => {
    localStorage.setItem(MEMORY_KEY, '{}');
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'Forget me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, forget me' }));
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/Forgotten/);
    expect(screen.getByText('Polite Stranger')).toBeInTheDocument();
  });

  it('can reveal exactly what is stored', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'Show raw data' }));
    expect(document.querySelector('pre')?.textContent).toMatch(/"version": 2/);
  });
});
