import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { allBehaviors } from '../../behaviors';
import { ActorChannel } from '../../engine/actors';
import { ManualClock } from '../../engine/clock';
import { World } from '../../engine/world';
import { useObjects } from '../../state/world';
import { getWorldState, initialWorldState, setWorldState } from '../../state/worldStore';
import SecretSpace from './SecretSpace';

describe('the cabinet', () => {
  beforeEach(() => {
    setWorldState(initialWorldState());
    useObjects.getState().resetObjects();
  });

  const renderCabinet = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SecretSpace />
      </MemoryRouter>,
    );

  it('has a shelf per room, with counts', () => {
    setWorldState({ discoveries: { 'green-thumb': 1 } });
    renderCabinet();
    expect(screen.getByRole('region', { name: /^Garden: 1 of \d+$/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Anywhere: 0 of \d+$/ })).toBeInTheDocument();
  });

  it('some hints stay folded until a related find', () => {
    renderCabinet();
    fireEvent.click(screen.getByRole('button', { name: 'Show hints' }));
    const garden = within(screen.getByRole('region', { name: /^Garden:/ }));
    expect(garden.getByText(/There are jobs pinned to the garden fence/)).toBeInTheDocument();
    expect(garden.getAllByText('Find something nearby first.').length).toBeGreaterThan(0);
    expect(garden.queryByText('Twelve jobs on the fence. All of them.')).toBeNull();
  });
});

describe('gentle hands', () => {
  it('hovering Pim ten times without a single poke', () => {
    setWorldState(initialWorldState());
    const actors = new ActorChannel();
    actors.subscribe('pim', () => {});
    const world = new World({ clock: new ManualClock(), actors, seed: 4, behaviors: allBehaviors() });
    world.enterRoom('living');
    for (let i = 0; i < 10; i++) world.emit('POINTER_ENTERED', { target: 'pim', speed: 0.2 });
    expect(getWorldState().discoveries['gentle-hands']).toBeDefined();
  });
});
