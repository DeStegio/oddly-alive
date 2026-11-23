import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { initialWorldState, setWorldState } from '../../state/worldStore';
import Workshop from './Workshop';

/**
 * The Weather Workshop by keyboard. Replaces the old Mood Room tests (sill
 * buttons that nudged the mood, a barometer of weather buttons): the window
 * is a valley now, and nothing on the page lets you pick the weather.
 */
describe('<Workshop />', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
    useKeepsakes.getState().reset();
  });

  const renderIt = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Workshop />
      </MemoryRouter>,
    );

  it('opens on the first postcard, with Nimbus asking and the valley ready', () => {
    renderIt();
    expect(screen.getByRole('heading', { name: 'Weather Workshop' })).toBeInTheDocument();
    expect(screen.getByText(/could I have a cloud/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'The valley in the glass box' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Barometer' })).toBeInTheDocument();
  });

  it('the barometer is a gauge: there is no button that picks the weather', () => {
    renderIt();
    for (const w of ['sunny', 'rain', 'storm', 'snow', 'rainbow']) expect(screen.queryByRole('button', { name: new RegExp(`^${w}$`, 'i') })).toBeNull();
  });

  it('only the postcard’s tools are on offer; the keyboard carries one into the valley', () => {
    renderIt();
    expect(screen.getByRole('button', { name: /^Ice cube/ })).toBeDisabled();
    const cup = screen.getByRole('button', { name: /^Teacup/ });
    fireEvent.keyDown(cup, { key: 'Enter' });
    const box = screen.getByRole('group', { name: 'The valley in the glass box' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /^Teacup in the valley/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Teacup in the valley/ }), { key: 'Delete' });
    expect(screen.queryByRole('button', { name: /^Teacup in the valley/ })).toBeNull();
  });

  it('the weathervane goes up and down; the sandbox has everything', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: /The sandbox valley/ }));
    expect(screen.getByRole('button', { name: /^Mirror/ })).not.toBeDisabled();
    const vane = screen.getByRole('button', { name: /weathervane, up/ });
    fireEvent.click(vane);
    expect(screen.getByRole('button', { name: /weathervane, lowered/ })).toBeInTheDocument();
  });
});
