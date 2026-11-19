import { actors } from '../engine/actors';
import { audio } from '../engine/audio';
import type { World } from '../engine/world';
import { useSettings } from '../state/settings';
import { useObjects } from '../state/world';
import { getWorldState, useWorldStore } from '../state/worldStore';

/** Connects the opt-in audio layer to settings, the world and the actors. */
export function startAudio(world: World): () => void {
  const cleanups: Array<() => void> = [];

  const applyRadio = () => {
    const on = useSettings.getState().sound && useObjects.getState().after.radioOn && getWorldState().room === 'after-hours';
    if (on) audio.startLullaby();
    else audio.stopLullaby();
  };

  // the toggle click is the user gesture that unlocks audio
  cleanups.push(
    useSettings.subscribe((s, prev) => {
      if (s.sound !== prev.sound) {
        audio.setEnabled(s.sound);
        if (s.sound) audio.play('chime');
        applyRadio();
      }
    }),
  );
  cleanups.push(useObjects.subscribe((s, prev) => s.after.radioOn !== prev.after.radioOn && applyRadio()));
  cleanups.push(useWorldStore.subscribe((s, prev) => s.room !== prev.room && applyRadio()));

  world.setSoundHandler((name) => audio.play(name));
  cleanups.push(() => world.setSoundHandler(null));
  cleanups.push(actors.observe((id, cmd) => cmd.type === 'say' && audio.voice(id, cmd.text)));
  cleanups.push(
    world.use({
      onEvent: (ev) => {
        if (ev.type === 'SECRET_DISCOVERED' && ev.payload.firstTime) audio.play('chime');
        else if (ev.type === 'MOOD_CHANGED') audio.mood(ev.payload.to);
      },
    }),
  );

  const onVis = () => audio.suspend(document.hidden);
  document.addEventListener('visibilitychange', onVis);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVis));
  cleanups.push(() => audio.setEnabled(false));

  return () => {
    for (const c of cleanups.reverse()) c();
  };
}
