import { secretById } from '../content/secrets';
import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, isTarget, say, send, tempo } from './helpers';

const LIVING = ['living'] as const;
const FORMS = ['', 'a party hat', 'very serious glasses', 'a bow'];

/**
 * Advanced combinations: multi-character gags, cross-room event chains, and
 * transformations that depend on what happened before.
 */
export const comboBehaviors = [
  // Pim transforms when poked quickly while playful (INT-030)
  defineBehavior({
    id: 'pim.transform',
    implements: ['INT-030', 'INT-055'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    cooldownMs: 2500,
    weight: (c) => (c.view.recent('pim', 2500) >= 3 && (c.view.mood === 'playful' || c.view.mood === 'excited' || c.view.mood === 'mischievous') ? 200 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 2200, () => {
        const next = ((Number(c.view.flag('living.pimForm')) || 0) + 1) % FORMS.length;
        c.effects.setFlag('living.pimForm', next);
        anim(c, 'pim', 'spin');
        face(c, 'pim', 'excited', 1800);
        say(c, 'pim', next === 0 ? ['back to basics.', 'au naturel.'] : [`new look: ${FORMS[next]}.`, `do you like ${FORMS[next]}?`], 2000);
      }),
  }),

  // two characters disagree (INT-075)
  defineBehavior({
    id: 'argue.time',
    implements: ['INT-075', 'INT-057'],
    on: ['USER_IDLE'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    chance: 0.5,
    cooldownMs: 90_000,
    when: (c) => c.event.payload.level === 'short',
    react: (c) =>
      act(
        'argue',
        5200,
        (ctl) => {
          say(c, 'tick', ['it is exactly now o’clock.', 'technically it’s later than you think.'], 1800);
          anim(c, 'tick', 'shake');
          ctl.after(tempo(c, 1700), () => {
            say(c, 'lumen', ['it’s LAMP o’clock.', 'wrong. it’s bedtime for clocks.'], 1800);
            anim(c, 'lumen', 'wiggle');
          });
          ctl.after(tempo(c, 3500), () => say(c, 'pim', ['please don’t make me pick a side.', 'they do this every day.'], 1700));
        },
        { ambient: true },
      ),
  }),

  // Dot boops Pim on his own (INT-057)
  defineBehavior({
    id: 'dot.boops.pim',
    implements: ['INT-057', 'INT-026'],
    on: ['POINTER_MOVED'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    chance: 0.05,
    cooldownMs: 60_000,
    react: (c) =>
      act(
        'boop',
        2400,
        (ctl) => {
          anim(c, 'dot', 'jump');
          ctl.after(400, () => {
            anim(c, 'pim', 'squish');
            face(c, 'pim', 'surprised', 900);
          });
          ctl.after(1200, () => say(c, 'pim', ['Dot. personal space.', 'oof. hi, Dot.'], 1400));
        },
        { ambient: true },
      ),
  }),

  // Dot copied the cursor path (INT-010)
  defineBehavior({
    id: 'dot.mimic.comment',
    implements: ['INT-010'],
    on: ['OBJECT_STATE_CHANGED'],
    priority: Priority.AMBIENT,
    chance: 0.5,
    cooldownMs: 30_000,
    when: (c) => c.event.payload.target === 'dot' && c.event.payload.key === 'mimic',
    react: (c) => act('pim', 2000, () => void say(c, 'pim', ['Dot is copying you.', 'he does that. it’s a compliment.'], 2000), { ambient: true }),
  }),

  // ---------------------------------------------------------------- cross-room chains

  // remember secrets found elsewhere… (INT-095, INT-080)
  defineBehavior({
    id: 'cross.gossip.note',
    on: ['SECRET_DISCOVERED'],
    priority: Priority.RARE,
    when: (c) => c.event.payload.firstTime && c.view.room !== 'living' && secretById(c.event.payload.secret)?.room !== 'living',
    react: (c) => act('ambient:gossip', 50, () => void c.effects.setFlag('living.gossip', c.event.payload.secret)),
  }),
  // …and gossip about them back in the Living Room
  defineBehavior({
    id: 'cross.gossip',
    implements: ['INT-095', 'INT-080', 'INT-035'],
    on: ['ROOM_ENTERED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    when: (c) => typeof c.view.flag('living.gossip') === 'string' && c.view.flag('living.gossip') !== '',
    react: (c) => {
      const s = secretById(String(c.view.flag('living.gossip')));
      return act('pim', 3600, (ctl) => {
        c.effects.setFlag('living.gossip', '');
        ctl.after(900, () => {
          face(c, 'pim', 'curious', 2600);
          say(c, 'pim', s ? [`psst. I heard about “${s.name}”.`, `word travels. “${s.name}”, really?`] : ['I heard things.'], 2800);
        });
      });
    },
  }),
  defineBehavior({
    id: 'cross.lamp.mood',
    implements: ['INT-080'],
    on: ['ROOM_ENTERED'],
    rooms: ['mood'],
    priority: Priority.AMBIENT,
    when: (c) => c.view.flag('living.lampOn') === false,
    react: (c) => act('nimbus:cross', 3600, (ctl) => ctl.after(3200, () => say(c, 'nimbus', ['someone turned the lamp off downstairs. very moody of you.'], 2600)), { ambient: true }),
  }),
  defineBehavior({
    id: 'cross.key.chest',
    implements: ['INT-095'],
    on: ['ROOM_ENTERED'],
    rooms: ['secret'],
    priority: Priority.CHARACTER,
    when: (c) => c.view.flag('secret.keyFound') === true && c.view.flag('secret.chestOpen') !== true,
    react: (c) => act('room:jingle', 3000, (ctl) => ctl.after(2600, () => say(c, 'room', ['…something in your pocket jingled. the chest noticed.'], 2400))),
  }),
  defineBehavior({
    id: 'cross.aunt.portrait',
    implements: ['INT-095', 'INT-085'],
    on: ['ROOM_ENTERED'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    chance: 0.6,
    cooldownMs: 120_000,
    when: (c) => c.view.discovered('aunt'),
    react: (c) =>
      act('picture', 3000, (ctl) =>
        ctl.after(2000, () => {
          anim(c, 'picture', 'tilt');
          say(c, 'picture', ['nice to see you again, dear.', 'you found my cabinet. discreet, please.'], 2600);
        }),
      ),
  }),
  defineBehavior({
    id: 'cross.nap.living',
    implements: ['INT-080'],
    on: ['ROOM_ENTERED'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    when: (c) => c.view.flag('mood.napping') === true,
    react: (c) =>
      act('tick:nap', 3000, () => {
        face(c, 'tick', 'asleep', 2800);
        send(c, 'pim', { type: 'expression', value: 'sleepy', durationMs: 2800 });
      }),
  }),

  // Ferdinand enjoys a fast scroll breeze (INT-033)
  defineBehavior({
    id: 'plant.breeze',
    implements: ['INT-033', 'INT-049'],
    on: ['SCROLL_CHANGED'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    cooldownMs: 6000,
    when: (c) => Math.abs(c.event.payload.velocity) > 2,
    react: (c) => act('ferdinand', 800, () => void anim(c, 'ferdinand', 'wiggle'), { ambient: true }),
  }),
];
