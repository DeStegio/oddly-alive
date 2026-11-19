import { LINES } from '../content/lines';
import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, isTarget, say, send } from './helpers';

const rare = (id: string) => (c: { event: { payload: unknown } }) => (c.event.payload as { event?: string }).event === id;

/** What rare events look like. The Surprise Director decides *when*. */
export const rareBehaviors = [
  defineBehavior({
    id: 'rare.inch',
    implements: ['INT-056'],
    on: ['RARE_EVENT'],
    priority: Priority.RARE,
    when: rare('inch-crawl'),
    react: (c) => act('visitor', 11_000, () => void anim(c, 'visitor', 'enter', 10_500)),
  }),
  defineBehavior({
    id: 'rare.inch.caught',
    implements: ['INT-082'],
    on: ['OBJECT_CLICKED'],
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'visitor'),
    react: (c) =>
      act('visitor:talk', 2400, () => {
        say(c, 'visitor', ['hi! just passing through.', 'don’t mind me. I’m commuting.', 'oh! you saw me.'], 2400);
        c.effects.discover('inch');
      }),
  }),
  defineBehavior({
    id: 'rare.fake-error',
    implements: ['INT-087'],
    on: ['RARE_EVENT'],
    priority: Priority.RARE,
    when: rare('fake-error'),
    react: (c) =>
      act('glitch', 4200, (ctl) => {
        send(c, 'glitch', { type: 'say', text: LINES.fakeError, durationMs: 3000 });
        anim(c, 'glitch', 'shake', 3000);
        ctl.after(3100, () => {
          send(c, 'glitch', { type: 'say', text: 'fixed. carry on. nothing happened.', durationMs: 1000 });
          c.effects.discover('glitch');
        });
      }),
  }),
  defineBehavior({
    id: 'rare.everyone-looks',
    implements: ['INT-093', 'INT-058'],
    on: ['RARE_EVENT'],
    rooms: ['living'],
    priority: Priority.RARE,
    when: rare('everyone-looks'),
    react: (c) =>
      act('room', 3600, (ctl) => {
        for (const id of ['pim', 'dot', 'tick'] as const) send(c, id, { type: 'gaze', target: { x: 1, y: -1 }, durationMs: 2400 });
        face(c, 'pim', 'surprised', 2400);
        ctl.after(1300, () => say(c, 'pim', ['did you hear that?', '…the house creaked.', 'probably nothing. probably.'], 2000));
      }),
  }),
  defineBehavior({
    id: 'rare.picture-swing',
    implements: ['INT-089'],
    on: ['RARE_EVENT'],
    rooms: ['living'],
    priority: Priority.RARE,
    when: rare('picture-swing'),
    react: (c) =>
      act('picture', 3000, (ctl) => {
        anim(c, 'picture', 'tilt');
        ctl.after(500, () => say(c, 'picture', ['ahem. I’m still here.', 'in my day, websites stayed still.'], 2400));
      }),
  }),
  defineBehavior({
    id: 'rare.gravity',
    on: ['RARE_EVENT'],
    rooms: ['playground'],
    priority: Priority.RARE,
    when: rare('gravity-hiccup'),
    react: (c) => act('dot', 2200, () => void say(c, 'dot', ['gravity hiccuped!', 'did the floor just sneeze?'], 2000)),
  }),
  defineBehavior({
    id: 'rare.sneeze',
    on: ['RARE_EVENT'],
    rooms: ['mood'],
    priority: Priority.RARE,
    when: rare('nimbus-sneeze'),
    react: (c) =>
      act('nimbus', 2200, () => {
        anim(c, 'nimbus', 'shake');
        say(c, 'nimbus', ['ACHOO!', 'sorry. drizzle.'], 1800);
      }),
  }),
];
