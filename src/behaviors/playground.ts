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
        say(c, 'dot', ['WHEEE', 'yeet!', 'that one’s going to feel it tomorrow.', 'airborne!'], 1600);
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
    react: (c) => act('dot', 1600, () => void say(c, 'dot', ['gently does it.', 'very careful. very nice.', 'a delicate placement.'], 1600)),
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
        say(c, 'dot', ['a TOWER. architectural.', 'look how tall. don’t breathe.'], 2400);
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
        say(c, 'dot', ['earthquake!', 'everybody jump!'], 1500);
      }),
  }),
  defineBehavior({
    id: 'pg.reset',
    implements: ['INT-070'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'reset',
    react: (c) => act('dot', 1600, () => void say(c, 'dot', ['good as new.', 'nobody saw anything.', 'tidy!'], 1500)),
  }),
  defineBehavior({
    id: 'pg.full',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: PG,
    priority: Priority.CHARACTER,
    cooldownMs: 8000,
    when: (c) => c.event.payload.target === 'playground' && c.event.payload.key === 'full',
    react: (c) => act('dot', 2200, () => void say(c, 'dot', ['no more room! physics has limits.', 'the floor is full. like, full full.'], 2200)),
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
    react: (c) => act('dot', 1400, () => void say(c, 'dot', ['boop the pile.', 'scatter!'], 1300)),
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
