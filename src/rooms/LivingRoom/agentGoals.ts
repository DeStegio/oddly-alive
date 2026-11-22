import { pickLine } from '../../behaviors/helpers';
import type { GoalControl, GoalDef } from '../../engine/agents/types';
import type { ActorId, Expression } from '../../engine/types';

/** What the Living Room offers its agents: where things are, and Dot's legs. */
export interface LivingStage {
  /** Where a named thing is on screen (client coordinates), if it's there. */
  rect(name: StageThing): DOMRect | null;
  /** Send Dot somewhere; onArrive fires once on arrival. */
  dotTo(target: StageThing, onArrive?: () => void): void;
  /** Let Dot go back to following the visitor. */
  dotFree(): void;
}
export type StageThing = 'button' | 'picture' | 'pim' | 'lamp' | 'tick' | 'sofa' | 'cushion' | 'cup' | 'plant';

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
        c.emit('OBJECT_STATE_CHANGED', { target: 'button', key: 'poked', value: 'dot' });
        c.after(700, () => {
          face(c, 'dot', 'happy', 1500);
          c.satisfy('dot', 'play', -0.5);
          c.remember('dot:pressed-button');
          c.outcome = 'pressed';
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
