import { pickLine } from '../../behaviors/helpers';
import { Priority } from '../../engine/scheduler';
import type { GoalControl, GoalDef } from '../../engine/agents/types';
import type { ActorId, Expression } from '../../engine/types';
import { DOT_PRIES, TICK_PUTS_BACK } from '../../content/button';
import type { Place, PropId, PropPos, SpotTarget } from './incidents/stageProps';
import { CALLBACKS } from '../../content/continuity';
import { useKeepsakes } from '../../state/keepsakes';

const DAY = 86_400_000;
const story = (key: string, within = 7 * DAY) => {
  const at = useKeepsakes.getState().story[key];
  return at !== undefined && Date.now() - at < within;
};

/** What the Living Room offers its agents: where things are, Dot's legs, and the movable props. */
export interface LivingStage {
  /** Where a named thing is on screen (client coordinates), if it's there. */
  rect(name: StageThing): DOMRect | null;
  /** Send Dot somewhere (a thing, or a point as stage fractions); onArrive fires once on arrival. */
  dotTo(target: StageThing | { x: number; y: number }, onArrive?: () => void): void;
  /** Dot stays where he is (no chasing the pointer) until sent somewhere or freed. */
  dotHold(): void;
  /** Let Dot go back to following the visitor. */
  dotFree(): void;
  /** Where Dot is now, as stage fractions (clamped to the floor). */
  dotPoint(): { x: number; y: number };
  /** Act on the button (Dot prying the glass, Tick putting it back, Dot pressing it). */
  button(type: 'pry' | 'putBack' | 'press'): string;
  /** The movable things: cushion, teacup, spotlight. */
  props: {
    get(id: PropId): PropPos;
    move(id: PropId, place: Place, at?: { x: number; y: number }): void;
    spot(on: boolean, target?: SpotTarget): void;
    /** How long a prop has been out of place (ms; 0 if home). */
    outFor(id: PropId): number;
  };
}
export type StageThing = 'button' | 'picture' | 'pim' | 'dot' | 'lamp' | 'tick' | 'sofa' | 'cushion' | 'cup' | 'cushion-home' | 'cup-home' | 'plant';

const LIVING = ['living'] as const;
const centre = (r: DOMRect | null) => (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
const face = (c: GoalControl, id: ActorId, value: Expression, ms: number) => c.actors.send(id, { type: 'expression', value, durationMs: ms });
const say = (c: GoalControl, id: ActorId, lines: readonly string[], ms = 2200) => c.actors.send(id, { type: 'say', text: pickLine(id, lines, c.rng), durationMs: ms });
const look = (c: GoalControl, id: ActorId, at: StageThing, ms: number) => {
  const p = centre(c.stage<LivingStage>('living')?.rect(at) ?? null);
  if (p) c.actors.send(id, { type: 'gaze', target: p, durationMs: ms });
};

/**
 * Small things the Living Room's characters do on their own. Body first,
 * words rarely; every goal puts things back the way they should be when it
 * ends, however it ends.
 */
export const LIVING_GOALS: GoalDef[] = [
  {
    // Dot hasn't forgotten that rally
    id: 'dot.brag',
    actor: 'dot',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 3200,
    cooldownMs: 15 * 60_000,
    answers: ['attention'],
    when: (p) => story('volley-rally') && (useKeepsakes.getState().records.dotRally ?? 0) >= 6 && p.idleMs > 5000 && !p.remembers('dot:bragged'),
    utility: () => 0.6,
    start(c) {
      c.actors.send('dot', { type: 'anim', name: 'bounce', durationMs: 700 });
      c.actors.send('dot', { type: 'say', text: CALLBACKS.dotBrag(useKeepsakes.getState().records.dotRally ?? 0), durationMs: 2600 });
      c.remember('dot:bragged');
      c.satisfy('dot', 'attention', -0.4);
      c.outcome = 'bragged';
    },
  },
  {
    // after the teacup business, Tick keeps an eye on it
    id: 'tick.remembers-cup',
    actor: 'tick',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 3000,
    cooldownMs: 15 * 60_000,
    answers: ['order'],
    when: (p) => story('incident-teacup', 3 * DAY) && p.owner('cup') === null && !p.remembers('tick:cup-watch') && !!p.stage('living') && p.stage<LivingStage>('living')!.props.get('cup').place === 'home',
    utility: () => 0.5,
    start(c) {
      look(c, 'tick', 'cup', 2200);
      face(c, 'tick', 'suspicious', 2200);
      say(c, 'tick', CALLBACKS.tickCup, 2200);
      look(c, 'dot', 'tick', 1500);
      c.remember('tick:cup-watch');
      c.outcome = 'watching';
    },
  },
  {
    // The glass is up: Dot can't resist. Tick can't resist putting it back.
    id: 'dot.pry-glass',
    actor: 'dot',
    // asked for by the visitor sometimes, so it outranks Dot's idle plans
    priority: Priority.CHARACTER,
    cast: ['tick'],
    rooms: LIVING,
    kind: 'ambient',
    props: ['button'],
    durationMs: 14_000,
    cooldownMs: 25_000,
    answers: ['play', 'curiosity'],
    when: (p) => p.flag('living.buttonMode') === 'shielded' && !!p.stage('living'),
    utility: () => 0.9,
    start(c) {
      const stage = c.stage<LivingStage>('living')!;
      face(c, 'dot', 'mischievous', 3000);
      stage.dotTo('button', () => {
        c.actors.send('dot', { type: 'anim', name: 'wiggle', durationMs: 700 });
        c.after(700, () => {
          if (stage.button('pry') !== 'pried') return c.done('too late');
          if (c.rng() < 0.5) say(c, 'dot', DOT_PRIES, 1200);
          c.satisfy('dot', 'play', -0.4);
          c.remember('dot:pried-glass');
          c.outcome = 'pried';
          // Tick has views on this
          c.after(1400, () => {
            look(c, 'tick', 'button', 2400);
            face(c, 'tick', 'annoyed', 2400);
          });
          c.after(4200, () => {
            if (stage.button('putBack') === 'repaired') {
              say(c, 'tick', TICK_PUTS_BACK, 1800);
              c.satisfy('tick', 'order', -0.4);
              c.outcome = 'pried, put back';
            }
          });
          c.after(5600, () => c.done());
        });
      });
      return () => stage.dotFree();
    },
  },

  {
    // Tick can't stand a crooked frame
    id: 'tick.straighten',
    actor: 'tick',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 4200,
    cooldownMs: 45_000,
    answers: ['order'],
    when: (p) => Math.abs(Number(p.flag('living.pictureTilt') ?? 0)) >= 2 && !!p.stage('living'),
    utility: (p) => Math.min(1, 0.4 + Math.abs(Number(p.flag('living.pictureTilt') ?? 0)) / 10),
    start(c) {
      look(c, 'tick', 'picture', 2600);
      face(c, 'tick', 'annoyed', 2200);
      if (c.rng() < 0.4) say(c, 'tick', ['crooked.', 'that frame. again.', 'hold still, madam.'], 1800);
      c.after(1500, () => {
        c.effects.setFlag('living.pictureTilt', 0);
        c.actors.send('picture', { type: 'anim', name: 'tilt', durationMs: 600 });
        c.effects.sound('press');
      });
      c.after(2300, () => {
        face(c, 'tick', 'happy', 1600);
        c.satisfy('tick', 'order', -0.5);
        c.remember('tick:straightened');
        c.outcome = 'straightened';
      });
    },
  },
  {
    // Dot goes and presses the button, because it's there
    id: 'dot.press-button',
    actor: 'dot',
    rooms: LIVING,
    kind: 'ambient',
    props: ['button'],
    durationMs: 9000,
    cooldownMs: 60_000,
    answers: ['play', 'attention'],
    when: (p) => !p.reducedMotion && !!p.stage('living') && p.idleMs > 4000,
    utility: () => 0.7,
    start(c) {
      const stage = c.stage<LivingStage>('living')!;
      face(c, 'dot', 'mischievous', 3000);
      stage.dotTo('button', () => {
        c.actors.send('dot', { type: 'anim', name: 'squish', durationMs: 500 });
        const result = stage.button('press');
        if (result !== 'pressed') c.outcome = result;
        c.after(500, () => face(c, 'tick', 'annoyed', 1400));
        c.after(700, () => {
          face(c, 'dot', 'happy', 1500);
          c.satisfy('dot', 'play', -0.5);
          c.remember('dot:pressed-button');
          if (!c.outcome) c.outcome = 'pressed';
        });
        c.after(1800, () => c.done());
      });
      return () => stage.dotFree();
    },
  },
  {
    // Pim nods off on the sofa when nobody's doing anything
    id: 'pim.doze',
    actor: 'pim',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 12_000,
    cooldownMs: 50_000,
    answers: ['rest'],
    when: (p) => p.idleMs > 15_000,
    utility: (p) => Math.min(1, p.idleMs / 40_000),
    start(c) {
      face(c, 'pim', 'sleepy', 2200);
      c.after(2200, () => face(c, 'pim', 'asleep', 8000));
      // if someone played the stars lately, she hums it in her sleep
      if (story('sky-tune', DAY)) c.after(4200, () => say(c, 'pim', CALLBACKS.pimHum, 2400));
      c.after(10_200, () => {
        face(c, 'pim', 'neutral', 1200);
        c.satisfy('pim', 'rest', -0.7);
        c.outcome = 'rested';
      });
      return () => c.actors.send('pim', { type: 'reset' });
    },
  },
  {
    // Lumen wants to be looked at, so everyone looks at Lumen
    id: 'lumen.show-off',
    actor: 'lumen',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 3600,
    cooldownMs: 40_000,
    answers: ['attention'],
    when: (p) => p.flag('living.lampOn') === true && !!p.stage('living'),
    start(c) {
      c.actors.send('lumen', { type: 'anim', name: 'dim', durationMs: 900 });
      c.after(900, () => {
        c.actors.send('lumen', { type: 'anim', name: 'bounce', durationMs: 700 });
        for (const id of ['pim', 'tick', 'ferdinand'] as const) look(c, id, 'lamp', 1600);
        if (c.rng() < 0.35) say(c, 'lumen', ['ta-da.', 'yes, it’s me.', 'and… lights.'], 1600);
        c.satisfy('lumen', 'attention', -0.5);
        c.outcome = 'seen';
      });
    },
  },
  {
    // Ferdinand leans towards the lamp when it's on
    id: 'ferdinand.lean',
    actor: 'ferdinand',
    rooms: LIVING,
    kind: 'ambient',
    durationMs: 3000,
    cooldownMs: 30_000,
    answers: ['curiosity'],
    when: (p) => p.flag('living.lampOn') === true,
    start(c) {
      c.actors.send('ferdinand', { type: 'anim', name: 'tilt', durationMs: 2400 });
      c.satisfy('ferdinand', 'curiosity', -0.5);
      c.outcome = 'leaned';
    },
  },
];
