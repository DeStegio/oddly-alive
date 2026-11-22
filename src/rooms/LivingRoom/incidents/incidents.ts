import { pickLine } from '../../../behaviors/helpers';
import { INCIDENT_LINES as L } from '../../../content/incidents';
import type { GoalControl, GoalDef } from '../../../engine/agents/types';
import type { ActorAnim, ActorId, Expression } from '../../../engine/types';
import type { LivingStage } from '../agentGoals';
import type { PropId, SpotTarget } from './stageProps';

const LIVING = ['living'] as const;
const face = (c: GoalControl, id: ActorId, value: Expression, ms: number) => c.actors.send(id, { type: 'expression', value, durationMs: ms });
const anim = (c: GoalControl, id: ActorId, name: ActorAnim, ms = 700) => c.actors.send(id, { type: 'anim', name, durationMs: ms });
/** Lines are rare: half the time, nobody says anything. */
const maybeSay = (c: GoalControl, id: ActorId, lines: readonly string[], chance = 0.5, ms = 2000) => {
  if (c.rng() < chance) c.actors.send(id, { type: 'say', text: pickLine(id, lines, c.rng), durationMs: ms });
};
const look = (c: GoalControl, id: ActorId, at: Parameters<LivingStage['rect']>[0], ms: number) => {
  const r = c.stage<LivingStage>('living')?.rect(at);
  if (r) c.actors.send(id, { type: 'gaze', target: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, durationMs: ms });
};
/** The visitor put a prop down somewhere (or back). */
const visitorMoved = (type: string, payload: unknown, prop: string) => {
  const p = payload as { target?: string; key?: string };
  return type === 'OBJECT_STATE_CHANGED' && p.target === prop && p.key === 'visitor';
};
/** The visitor took a prop off Dot (it's in their hand now). */
const visitorGrabbed = (type: string, payload: unknown, prop: string) => {
  const p = payload as { target?: string; key?: string };
  return type === 'OBJECT_STATE_CHANGED' && p.target === prop && p.key === 'taken';
};

/** If an incident is cut short while Dot is carrying something, he drops it where he is. */
function dropIfCarrying(stage: LivingStage, prop: PropId) {
  if (stage.props.get(prop).place === 'dot') stage.props.move(prop, 'floor', stage.dotPoint());
}

/**
 * A. The sofa incident. Pim gets comfortable; Dot takes the cushion; Pim
 * notices. Put it back yourself, or Tick has a word and Dot brings it back,
 * or Dot falls asleep on it. Every path settles.
 */
export const sofaIncident: GoalDef = {
  id: 'incident.sofa',
  actor: 'dot',
  cast: ['pim'],
  rooms: LIVING,
  kind: 'incident',
  props: ['cushion'],
  durationMs: 26_000,
  cooldownMs: 120_000,
  answers: ['play', 'attention'],
  when: (p) => !!p.stage('living') && p.stage<LivingStage>('living')!.props.get('cushion').place === 'home' && !p.reducedMotion,
  utility: (p) => 0.6 + 0.3 * p.regard('dot', 'pim'),
  start(c) {
    const stage = c.stage<LivingStage>('living')!;
    let settled = false;
    const settle = (outcome: string) => {
      if (settled) return;
      settled = true;
      c.outcome = outcome;
      c.remember(`sofa:${outcome}`);
      c.after(2200, () => c.done());
    };
    c.onEvent((type, payload) => {
      if (settled) return;
      if (visitorGrabbed(type, payload, 'cushion')) {
        // snatched off him: Dot stops and stares
        stage.dotHold();
        face(c, 'dot', 'surprised', 1600);
        return;
      }
      if (visitorMoved(type, payload, 'cushion')) {
        // the visitor stepped in
        stage.dotFree();
        if (stage.props.get('cushion').place === 'home') {
          face(c, 'pim', 'happy', 2400);
          maybeSay(c, 'pim', L.pimThanks, 0.6);
          face(c, 'dot', 'annoyed', 1800);
          c.satisfy('pim', 'rest', -0.5);
          settle('visitor returned it');
        } else {
          face(c, 'dot', 'surprised', 1400);
          settle('visitor took it');
        }
      } else if (type === 'OBJECT_CLICKED' && (payload as { target?: string }).target === 'dot' && stage.props.get('cushion').place === 'dot') {
        // caught: he drops it
        stage.props.move('cushion', 'floor', stage.dotPoint());
        stage.dotFree();
        face(c, 'dot', 'shy', 1600);
        settle('dot dropped it');
      }
    });
    // Dot stops chasing the pointer: he has a plan
    stage.dotHold();
    // Pim settles in
    face(c, 'pim', 'happy', 2000);
    c.after(1600, () => face(c, 'pim', 'sleepy', 2500));
    // Dot has an idea
    c.after(2200, () => {
      look(c, 'dot', 'cushion', 1200);
      face(c, 'dot', 'mischievous', 3000);
      stage.dotTo('cushion', () => {
        if (settled) return;
        stage.props.move('cushion', 'dot');
        c.effects.sound('pop');
        face(c, 'pim', 'surprised', 1600);
        look(c, 'pim', 'dot', 2000);
        // off he goes with it
        stage.dotTo({ x: 0.82 + c.rng() * 0.1, y: 0.8 }, () => {
          if (settled) return;
          maybeSay(c, 'pim', L.pimHey, 0.5);
          face(c, 'pim', 'annoyed', 3000);
          anim(c, 'pim', 'wiggle', 900);
          c.after(2400, () => {
            if (settled) return;
            if (c.rng() < 0.4) {
              // Dot keeps it and naps on it
              stage.props.move('cushion', 'floor', stage.dotPoint());
              face(c, 'dot', 'asleep', 5000);
              face(c, 'pim', 'annoyed', 3000);
              settle('dot napped on it');
              return;
            }
            // Tick has a word
            look(c, 'tick', 'dot', 2200);
            face(c, 'tick', 'annoyed', 2200);
            maybeSay(c, 'tick', L.tickGiveBack, 0.7);
            c.after(1600, () => {
              if (settled) return;
              face(c, 'dot', 'shy', 2000);
              stage.dotTo('cushion-home', () => {
                if (settled) return;
                stage.props.move('cushion', 'home');
                face(c, 'pim', 'happy', 2000);
                c.satisfy('tick', 'order', -0.4);
                settle('tick made dot return it');
              });
            });
          });
        });
      });
    });
    return () => {
      dropIfCarrying(stage, 'cushion');
      stage.dotFree();
    };
  },
};

/**
 * B. The stolen teacup. Dot pinches Pim's cup off the side table and makes for
 * the plant. Tick is outraged. Take it off Dot (drag it, or click Dot and he
 * drops it), find it behind the plant, or let Tick's alarm do the job.
 */
export const teacupIncident: GoalDef = {
  id: 'incident.teacup',
  actor: 'dot',
  cast: ['tick'],
  rooms: LIVING,
  kind: 'incident',
  props: ['cup'],
  durationMs: 30_000,
  cooldownMs: 140_000,
  answers: ['play', 'curiosity'],
  when: (p) => !!p.stage('living') && p.stage<LivingStage>('living')!.props.get('cup').place === 'home' && !p.reducedMotion,
  utility: (p) => 0.55 - 0.2 * p.regard('dot', 'tick'),
  start(c) {
    const stage = c.stage<LivingStage>('living')!;
    let settled = false;
    const settle = (outcome: string) => {
      if (settled) return;
      settled = true;
      c.outcome = outcome;
      c.remember(`teacup:${outcome}`);
      c.after(2000, () => c.done());
    };
    const relieved = () => {
      face(c, 'tick', 'happy', 2200);
      maybeSay(c, 'tick', L.tickThanks, 0.6);
    };
    c.onEvent((type, payload) => {
      if (settled) return;
      const p = payload as { target?: string };
      if (visitorGrabbed(type, payload, 'cup')) {
        stage.dotHold();
        face(c, 'dot', 'surprised', 1600);
        return;
      }
      if (visitorMoved(type, payload, 'cup')) {
        stage.dotFree();
        face(c, 'dot', 'annoyed', 1600);
        if (stage.props.get('cup').place === 'home') relieved();
        settle(stage.props.get('cup').place === 'home' ? 'visitor returned it' : 'visitor took it');
      } else if (type === 'OBJECT_CLICKED' && p.target === 'dot' && stage.props.get('cup').place === 'dot') {
        // caught red-handed: he drops it
        stage.props.move('cup', 'floor', stage.dotPoint());
        stage.dotFree();
        face(c, 'dot', 'shy', 1800);
        c.effects.sound('pop');
        settle('dot dropped it');
      } else if (type === 'OBJECT_CLICKED' && p.target === 'ferdinand' && stage.props.get('cup').place === 'hidden') {
        stage.props.move('cup', 'home');
        relieved();
        settle('found behind the plant');
      }
    });
    stage.dotHold();
    face(c, 'dot', 'mischievous', 2500);
    stage.dotTo('cup', () => {
      if (settled) return;
      stage.props.move('cup', 'dot');
      c.effects.sound('pop');
      // Tick saw that
      c.after(500, () => {
        look(c, 'tick', 'dot', 3000);
        face(c, 'tick', 'surprised', 1200);
        c.after(1200, () => face(c, 'tick', 'annoyed', 3000));
        maybeSay(c, 'tick', L.tickThief, 0.6);
      });
      stage.dotTo('plant', () => {
        if (settled) return;
        stage.props.move('cup', 'hidden');
        stage.dotFree();
        face(c, 'dot', 'happy', 2000);
        // the plant rustles: a clue
        c.after(1400, () => anim(c, 'ferdinand', 'wiggle', 900));
        // Tick's alarm, if nobody does anything
        c.after(7000, () => {
          if (settled) return;
          anim(c, 'tick', 'shake', 900);
          c.effects.sound('chime');
          face(c, 'dot', 'surprised', 1200);
          anim(c, 'dot', 'jump', 600);
          c.after(900, () => {
            if (settled) return;
            stage.dotTo('plant', () => {
              if (settled) return;
              stage.props.move('cup', 'dot');
              stage.dotTo('cup-home', () => {
                if (settled) return;
                stage.props.move('cup', 'home');
                face(c, 'dot', 'shy', 1600);
                relieved();
                c.satisfy('tick', 'order', -0.5);
                settle('tick rang until dot brought it back');
              });
            });
          });
        });
      });
    });
    return () => {
      dropIfCarrying(stage, 'cup');
      stage.dotFree();
    };
  },
};

const REACT: Record<SpotTarget, (c: GoalControl) => void> = {
  pim: (c) => {
    face(c, 'pim', 'shy', 2600);
    anim(c, 'pim', 'hide', 1600);
    maybeSay(c, 'pim', L.pimSpot, 0.4);
  },
  dot: (c) => {
    face(c, 'dot', 'excited', 2600);
    anim(c, 'dot', 'spin', 800);
    maybeSay(c, 'dot', L.dotSpot, 0.4);
  },
  tick: (c) => {
    face(c, 'tick', 'annoyed', 2600);
    maybeSay(c, 'tick', L.tickSpot, 0.5);
  },
  button: (c) => {
    c.actors.send('button', { type: 'anim', name: 'squish', durationMs: 500 });
  },
};

/**
 * C. The spotlight drama. Lumen picks someone and shines on them: Pim hides,
 * Dot performs, Tick objects, the button squirms. Drag the pool of light to
 * someone else, or switch Lumen off to end the show.
 */
export const spotlightIncident: GoalDef = {
  id: 'incident.spotlight',
  actor: 'lumen',
  rooms: LIVING,
  kind: 'incident',
  props: ['spot'],
  durationMs: 16_000,
  cooldownMs: 100_000,
  answers: ['attention'],
  when: (p) => p.flag('living.lampOn') === true && !!p.stage('living'),
  utility: () => 0.6,
  start(c) {
    const stage = c.stage<LivingStage>('living')!;
    const order: SpotTarget[] = (['pim', 'dot', 'tick', 'button'] as const).filter((t) => stage.rect(t));
    // a different running order each time
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(c.rng() * (k + 1));
      [order[k], order[j]] = [order[j]!, order[k]!];
    }
    let i = 0;
    let ended = false;
    const shine = (t: SpotTarget) => {
      stage.props.spot(true, t);
      REACT[t](c);
    };
    const finish = (outcome: string) => {
      if (ended) return;
      ended = true;
      c.outcome = outcome;
      c.remember(`spotlight:${outcome}`);
      stage.props.spot(false);
      c.after(600, () => c.done());
    };
    c.onEvent((type, payload) => {
      if (ended) return;
      const p = payload as { target?: string; key?: string; value?: unknown };
      if (type === 'OBJECT_STATE_CHANGED' && p.target === 'spot' && p.key === 'visitor') {
        // the visitor redirects the show
        REACT[p.value as SpotTarget]?.(c);
        c.actors.send('lumen', { type: 'expression', value: 'surprised', durationMs: 1200 });
        c.outcome = `redirected to ${String(p.value)}`;
      } else if (type === 'OBJECT_STATE_CHANGED' && p.target === 'lumen' && p.key === 'on' && p.value === false) {
        finish('lights out');
      }
    });
    // anticipation: a dim, a breath, then the light
    anim(c, 'lumen', 'dim', 700);
    c.after(800, () => {
      if (!order.length) return finish('nobody home');
      shine(order[0]!);
      maybeSay(c, 'lumen', L.lumenShow, 0.4);
    });
    const next = () => {
      if (ended) return;
      i++;
      if (i >= Math.min(3, order.length)) {
        anim(c, 'lumen', 'bounce', 700);
        c.satisfy('lumen', 'attention', -0.6);
        return finish(c.outcome || 'took a bow');
      }
      if (!c.outcome.startsWith('redirected')) shine(order[i]!);
      c.after(3800, next);
    };
    c.after(4600, next);
    return () => stage.props.spot(false);
  },
};

/** Out-of-place things don't stay out forever: Dot, eventually, brings them back. */
export const dotTidies: GoalDef = {
  id: 'dot.tidy',
  actor: 'dot',
  rooms: LIVING,
  kind: 'ambient',
  durationMs: 12_000,
  cooldownMs: 30_000,
  answers: ['attention'],
  when: (p) => {
    const st = p.stage<LivingStage>('living');
    if (!st) return false;
    return (['cushion', 'cup'] as const).some((id) => st.props.get(id).place !== 'home' && st.props.get(id).place !== 'dot' && st.props.outFor(id) > 25_000);
  },
  utility: () => 0.8,
  start(c) {
    const stage = c.stage<LivingStage>('living')!;
    const id = (['cushion', 'cup'] as const).find((p) => stage.props.get(p).place !== 'home' && stage.props.get(p).place !== 'dot')!;
    face(c, 'dot', 'shy', 2000);
    stage.dotTo(id, () => {
      stage.props.move(id, 'dot');
      stage.dotTo(id === 'cushion' ? 'cushion-home' : 'cup-home', () => {
        stage.props.move(id, 'home');
        c.outcome = `put the ${id} back`;
        c.after(600, () => c.done());
      });
    });
    return () => {
      dropIfCarrying(stage, id);
      stage.dotFree();
    };
  },
};

export const INCIDENTS: GoalDef[] = [sofaIncident, teacupIncident, spotlightIncident, dotTidies];
