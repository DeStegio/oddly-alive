import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, say } from './helpers';

const PG = ['playground'] as const;
const isShape = (t: string) => t.startsWith('shape:');

/** In the Playground, Dot is the (unqualified) sports commentator. */
export const playgroundBehaviors = [
  defineBehavior({
    id: 'pg.throw.fast',
    implements: ['INT-067', 'INT-022'],
    on: ['OBJECT_DRAGGED'],
    rooms: PG,
    group: 'pg.drag',
    priority: Priority.CHARACTER,
    cooldownMs: 3500,
    when: (c) => c.event.payload.phase === 'end' && c.event.payload.speed > 1.5 && isShape(c.event.payload.target),
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'jump');
        face(c, 'dot', 'excited', 1500);
        say(c, 'dot', ['WHEEE', 'that one’s going to feel it tomorrow.', 'AIRBORNE.', 'ten points. I just decided.'], 1600);
      }),
  }),
  defineBehavior({
    id: 'pg.throw.gentle',
    implements: ['INT-067'],
    on: ['OBJECT_DRAGGED'],
    rooms: PG,
    group: 'pg.drag',
    priority: Priority.CHARACTER,
    chance: 0.5,
    cooldownMs: 6000,
    when: (c) => c.event.payload.phase === 'end' && c.event.payload.speed <= 0.8 && c.event.payload.distance > 30,
    react: (c) => act('dot', 1600, () => void say(c, 'dot', ['gently does it.', 'like a surgeon.', 'shh. it’s balancing.'], 1600)),
  }),
  defineBehavior({
    id: 'pg.collide.big',
    implements: ['INT-064'],
    on: ['OBJECT_COLLIDED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 7000,
    when: (c) => c.event.payload.force > 9,
    react: (c) =>
      act('dot', 1400, () => {
        face(c, 'dot', 'surprised', 1200);
        anim(c, 'dot', 'shake');
        say(c, 'dot', ['oof.', 'BONK.', 'that was loud.'], 1300);
      }),
  }),
  defineBehavior({
    id: 'pg.tower',
    implements: ['INT-065'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'tower',
    react: (c) =>
      act('dot', 2600, () => {
        anim(c, 'dot', 'bounce');
        say(c, 'dot', ['a TOWER.', 'don’t breathe. nobody breathe.'], 2400);
      }),
  }),
  defineBehavior({
    id: 'pg.goal',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    // the tower already gets its own (DIRECT) celebration
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'goal' && c.event.payload.value !== 'tower',
    react: (c) =>
      act('dot', 2000, () => {
        anim(c, 'dot', 'bounce');
        face(c, 'dot', 'excited', 1600);
        say(c, 'dot', ['writing that down.', 'that’s going in the book.', 'one more for the notes.', 'tick. big tick.'], 1800);
      }),
  }),
  defineBehavior({
    id: 'pg.ejected',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 2500,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'ejected',
    react: (c) =>
      act('dot', 1800, () => {
        face(c, 'dot', 'surprised', 1400);
        say(c, 'dot', ['bye bye.', 'and it’s gone.', 'that one’s not coming back.', 'we had a good run, that one and me.'], 1600);
      }),
  }),
  defineBehavior({
    id: 'pg.over-the-fence',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 4000,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'overTheFence',
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'jump');
        say(c, 'dot', ['over the net!', 'Bip, heads up!', 'serve!'], 1400);
      }),
  }),
  defineBehavior({
    id: 'pg.rally-over',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 3000,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'rallyOver' && Number(c.event.payload.value) >= 3,
    react: (c) =>
      act('dot', 2200, () => {
        anim(c, 'dot', 'bounce');
        say(c, 'dot', [`a rally of ${String(c.event.payload.value)}. *small applause*`, 'what a match.', 'crowd of one, on its feet.'], 2000);
      }),
  }),
  defineBehavior({
    id: 'pg.shake',
    implements: ['INT-063'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 5000,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'shake',
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'dizzy');
        say(c, 'dot', ['EARTHQUAKE.', 'everybody hold onto something.'], 1500);
      }),
  }),
  defineBehavior({
    id: 'pg.reset',
    implements: ['INT-070'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'reset',
    react: (c) => act('dot', 1600, () => void say(c, 'dot', ['good as new.', 'nobody saw anything.', 'tidy. suspiciously tidy.'], 1500)),
  }),
  defineBehavior({
    id: 'pg.full',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 8000,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'full',
    react: (c) => act('dot', 2200, () => void say(c, 'dot', ['no more room.', 'the floor is full. like FULL full.'], 2200)),
  }),
  defineBehavior({
    id: 'pg.key',
    implements: ['INT-095'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'keyFound',
    react: (c) =>
      act('dot', 3000, () => {
        anim(c, 'dot', 'spin');
        say(c, 'dot', ['the key! I bet it opens something secret.', 'lost, then found. somewhere a chest is nervous.'], 3000);
      }),
  }),
  defineBehavior({
    id: 'pg.poke',
    on: ['OBJECT_CLICKED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    chance: 0.25,
    cooldownMs: 9000,
    when: (c) => c.event.payload.target === 'playground:floor',
    react: (c) => act('dot', 1400, () => void say(c, 'dot', ['boop.', 'scatter. SCATTER.'], 1300)),
  }),
  defineBehavior({
    id: 'pg.welcome',
    implements: ['INT-032', 'INT-035'],
    on: ['ROOM_ENTERED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    react: (c) =>
      act('dot', 2600, (ctl) => {
        ctl.after(600, () =>
          say(c, 'dot', c.event.payload.visits > 1 ? ['back for more physics?', 'the shapes missed you.'] : ['I followed you! this is my favourite room.', 'welcome to the floor.'], 2400),
        );
      }),
  }),
];
