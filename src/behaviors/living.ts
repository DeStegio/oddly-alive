import { LADDER_LINES } from '../content/attic';
import { LINES } from '../content/lines';
import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, isTarget, say, send, tempo } from './helpers';

const LIVING = ['living'] as const;
const num = (v: unknown) => (typeof v === 'number' ? v : 0);

/**
 * Living Room behaviors. Direct state changes (lamp on/off, presses, tilts)
 * happen in the component as immediate feedback; these behaviors decide how
 * the house *responds* to them, in character and in context.
 */
export const livingBehaviors = [
  // ------------------------------------------------------------ Pim: clicks
  defineBehavior({
    id: 'pim.click.default',
    implements: ['INT-072'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: 3,
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 1300, () => {
        face(c, 'pim', 'happy', tempo(c, 1200));
        anim(c, 'pim', 'squish');
        if (c.rng() < 0.4) say(c, 'pim', LINES.pimHappy, 1800);
      }),
  }),
  defineBehavior({
    id: 'pim.click.shy',
    implements: ['INT-072', 'INT-076'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.mood === 'shy' || c.view.vars.trust < 0.3 ? 6 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 1800, () => {
        face(c, 'pim', 'shy', tempo(c, 1600));
        anim(c, 'pim', 'peek');
        say(c, 'pim', LINES.pimShy, 2000);
      }),
  }),
  defineBehavior({
    id: 'pim.click.sleepy',
    implements: ['INT-071', 'INT-072'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.mood === 'sleepy' ? 10 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 2400, (ctl) => {
        // sleepy Pim responds late
        ctl.after(tempo(c, 500), () => {
          face(c, 'pim', 'sleepy', 1800);
          say(c, 'pim', LINES.pimSleepy, 2200);
        });
      }),
  }),
  defineBehavior({
    id: 'pim.click.excited',
    implements: ['INT-072'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.mood === 'excited' || c.view.mood === 'playful' ? 8 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 1200, () => {
        face(c, 'pim', 'excited', 1100);
        anim(c, 'pim', 'jump');
      }),
  }),
  defineBehavior({
    id: 'pim.click.affection',
    implements: ['INT-072', 'INT-076'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.mood === 'affectionate' ? 8 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 2200, () => {
        face(c, 'pim', 'affectionate', 2000);
        anim(c, 'pim', 'wiggle');
        say(c, 'pim', LINES.pimAffection, 2200);
      }),
  }),
  defineBehavior({
    id: 'pim.click.annoyed',
    implements: ['INT-021', 'INT-078'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.mood === 'annoyed' ? 12 : 0),
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 1600, () => {
        face(c, 'pim', 'annoyed', 1500);
        anim(c, 'pim', 'shake');
        if (c.rng() < 0.5) say(c, 'pim', LINES.pimAnnoyed, 2000);
      }),
  }),
  defineBehavior({
    id: 'pim.click.suspicious',
    implements: ['INT-021'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'pim.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.recent('pim', 6000) >= 5 ? 100 : 0),
    cooldownMs: 8000,
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 2400, () => {
        face(c, 'pim', 'suspicious', 2200);
        say(c, 'pim', ['what are you up to.', 'that’s a lot of clicking. suspicious.', 'are you… testing me?'], 2400);
      }),
  }),
  defineBehavior({
    id: 'dot.reacts.pim',
    implements: ['INT-026'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    chance: 0.35,
    cooldownMs: 4000,
    when: (c) => isTarget(c, 'pim'),
    react: (c) => act('dot', 700, () => void anim(c, 'dot', 'jump')),
  }),

  // ------------------------------------------------------------- Pim: hover
  defineBehavior({
    id: 'pim.hover.blink',
    implements: ['INT-003'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    when: (c) => isTarget(c, 'pim') && c.event.payload.speed <= 1.6,
    react: (c) => act('pim:lids', 220, () => void anim(c, 'pim', 'blink', 200)),
  }),
  defineBehavior({
    id: 'pim.hover.shy',
    implements: ['INT-008'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    group: 'pim.hover',
    priority: Priority.CHARACTER,
    weight: (c) => (c.view.count('hover:pim') <= 4 ? 5 : 1),
    when: (c) => isTarget(c, 'pim') && c.event.payload.speed < 0.45,
    react: (c) =>
      act('pim', 1600, () => {
        face(c, 'pim', 'shy', tempo(c, 1400));
        if (c.view.count('hover:pim') <= 2) say(c, 'pim', LINES.pimShy, 1800);
      }),
  }),
  defineBehavior({
    id: 'pim.hover.startled',
    implements: ['INT-008', 'INT-067'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    group: 'pim.hover',
    priority: Priority.CHARACTER,
    when: (c) => isTarget(c, 'pim') && c.event.payload.speed > 1.6,
    react: (c) =>
      act('pim', 1000, () => {
        face(c, 'pim', 'surprised', 900);
        anim(c, 'pim', 'jump');
      }),
  }),
  defineBehavior({
    id: 'pim.hover.familiar',
    implements: ['INT-009'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    group: 'pim.hover',
    priority: Priority.CHARACTER,
    cooldownMs: 20_000,
    weight: 4,
    when: (c) => isTarget(c, 'pim') && c.view.count('hover:pim') >= 5 && c.view.count('hover:pim') < 10,
    react: (c) =>
      act('pim', 2200, () => {
        face(c, 'pim', 'curious', 2000);
        say(c, 'pim', ['you again?', 'we keep meeting like this.', 'hello. again.'], 2200);
      }),
  }),
  defineBehavior({
    id: 'pim.hover.friendly',
    implements: ['INT-009', 'INT-076'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    group: 'pim.hover',
    priority: Priority.CHARACTER,
    cooldownMs: 15_000,
    weight: 6,
    when: (c) => isTarget(c, 'pim') && c.view.count('hover:pim') >= 10 && c.view.vars.trust > 0.35,
    react: (c) =>
      act('pim', 1600, () => {
        face(c, 'pim', 'happy', 1500);
        anim(c, 'pim', 'wiggle');
      }),
  }),
  defineBehavior({
    id: 'pim.stared',
    implements: ['INT-002'],
    on: ['POINTER_STARE'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 8000,
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 2400, () => {
        send(c, 'pim', { type: 'gaze', target: null, avert: true, durationMs: 2300 });
        face(c, 'pim', 'shy', 2300);
        say(c, 'pim', LINES.pimStared, 2200);
      }),
  }),
  defineBehavior({
    id: 'pim.circled',
    implements: ['INT-015', 'INT-025'],
    on: ['POINTER_CIRCLED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    cooldownMs: 6000,
    when: (c) => c.event.payload.target === 'pim',
    react: (c) =>
      act('pim', 2600, (ctl) => {
        anim(c, 'pim', 'spin');
        face(c, 'pim', 'dizzy', 2400);
        ctl.after(900, () => say(c, 'pim', LINES.pimConfused, 2000));
        c.effects.discover('circles');
      }),
  }),

  // ------------------------------------------------------------------ Dot
  defineBehavior({
    id: 'dot.click.hop',
    on: ['OBJECT_CLICKED'],
    group: 'dot.click',
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'dot'),
    react: (c) =>
      act('dot', 800, () => {
        anim(c, 'dot', 'jump');
        if (c.rng() < 0.5) say(c, 'dot', LINES.dotPoke, 1400);
      }),
  }),
  defineBehavior({
    id: 'dot.click.spin',
    on: ['OBJECT_CLICKED'],
    group: 'dot.click',
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'dot'),
    react: (c) => act('dot', 800, () => void anim(c, 'dot', 'spin')),
  }),
  defineBehavior({
    id: 'dot.zoomies',
    implements: ['INT-029', 'INT-055'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    group: 'dot.click',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.recent('dot', 5000) >= 5 && !c.view.flag('living.rearranged') ? 100 : 0),
    cooldownMs: 20_000,
    when: (c) => isTarget(c, 'dot'),
    react: (c) =>
      act('room', 30_000, (ctl) => {
        anim(c, 'dot', 'spin');
        say(c, 'dot', ['ZOOMIES', 'I have to run. I HAVE to.'], 2000);
        c.effects.setFlag('living.rearranged', true);
        ctl.after(600, () => face(c, 'pim', 'surprised', 1600));
        ctl.after(1400, () => say(c, 'pim', ['who moved the furniture.', 'Dot. DOT.'], 2400));
        // the room relaxes back on its own (INT-053)
        return () => c.effects.setFlag('living.rearranged', false);
      }),
  }),
  defineBehavior({
    id: 'pim.reacts.dot',
    implements: ['INT-026', 'INT-057'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    chance: 0.35,
    cooldownMs: 5000,
    when: (c) => isTarget(c, 'dot'),
    react: (c) =>
      act('pim', 1500, () => {
        face(c, 'pim', 'happy', 1400);
        say(c, 'pim', ['hehe. Dot.', 'Dot likes you.', 'careful, he bounces.'], 1800);
      }),
  }),
  defineBehavior({
    id: 'dot.caught',
    implements: ['INT-014'],
    on: ['OBJECT_STATE_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 15_000,
    when: (c) => c.event.payload.target === 'dot' && c.event.payload.key === 'caught',
    react: (c) =>
      act('dot', 1600, () => {
        anim(c, 'dot', 'catch');
        say(c, 'dot', LINES.dotCatch, 1600);
      }),
  }),
  defineBehavior({
    id: 'dot.dizzy',
    implements: ['INT-007'],
    on: ['POINTER_FRENZY'],
    priority: Priority.CHARACTER,
    cooldownMs: 10_000,
    when: (c) => c.event.payload.target === 'dot',
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'dizzy');
        face(c, 'dot', 'dizzy', 1700);
        say(c, 'dot', LINES.dotDizzy, 1800);
      }),
  }),

  // ----------------------------------------------------------------- Lamp
  defineBehavior({
    id: 'lamp.toggle.comment',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    chance: 0.45,
    when: (c) => c.event.payload.target === 'lumen' && c.event.payload.key === 'on' && c.view.recent('lumen', 4000) < 3,
    react: (c) =>
      act('lumen', 1800, () => {
        anim(c, 'lumen', 'wiggle');
        say(c, 'lumen', c.event.payload.value ? LINES.lumenOn : LINES.lumenOff, 1600);
      }),
  }),
  defineBehavior({
    id: 'lamp.sulk',
    implements: ['INT-016', 'INT-074'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    cooldownMs: 6000,
    when: (c) => isTarget(c, 'lumen') && c.view.recent('lumen', 4000) >= 4,
    react: (c) =>
      act('lumen', 2200, () => {
        face(c, 'lumen', 'annoyed', 2000);
        anim(c, 'lumen', 'shake');
        say(c, 'lumen', LINES.lumenSulk, 2000);
      }),
  }),
  defineBehavior({
    id: 'chain.dark',
    implements: ['INT-019', 'INT-027'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.target === 'lumen' && c.event.payload.key === 'on',
    react: (c) =>
      c.event.payload.value
        ? act('pim', 1200, () => void face(c, 'pim', 'happy', 1100))
        : act('pim', 2200, (ctl) => {
            face(c, 'pim', 'surprised', 2000);
            anim(c, 'dot', 'hide', 1800);
            ctl.after(tempo(c, 500), () => say(c, 'pim', ['who turned off the sun?', 'it’s dark. I’m not scared. you’re scared.'], 1800));
          }),
  }),
  defineBehavior({
    id: 'lamp.spotlight',
    implements: ['INT-089'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: LIVING,
    priority: Priority.RARE,
    chance: 0.12,
    cooldownMs: 60_000,
    when: (c) => c.event.payload.target === 'lumen' && c.event.payload.key === 'on' && c.event.payload.value === true,
    react: (c) =>
      act('lumen', 3200, (ctl) => {
        anim(c, 'lumen', 'bounce');
        ctl.after(400, () => say(c, 'lumen', LINES.lumenStar, 2400));
        ctl.after(900, () => send(c, 'pim', { type: 'gaze', target: { x: -1, y: 0 }, durationMs: 1800 }));
      }),
  }),

  // --------------------------------------------------------------- Button
  defineBehavior({
    id: 'button.chain',
    implements: ['INT-027', 'INT-058'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    cooldownMs: 7000,
    when: (c) => isTarget(c, 'button') && num(c.view.flag('living.buttonPresses')) >= 5,
    react: (c) =>
      act('room', 3400, (ctl) => {
        const step = tempo(c, 380);
        anim(c, 'lumen', 'dim');
        ctl.after(step, () => anim(c, 'tick', 'shake'));
        ctl.after(step * 2, () => anim(c, 'ferdinand', 'wiggle'));
        ctl.after(step * 3, () => {
          anim(c, 'pim', 'jump');
          face(c, 'pim', 'excited', 1200);
        });
        ctl.after(step * 4, () => anim(c, 'dot', 'spin'));
        ctl.after(step * 5, () => anim(c, 'picture', 'tilt'));
        ctl.after(step * 6, () => say(c, 'pim', ['everything happened.', 'that button does EVERYTHING.', 'again?'], 2000));
        c.effects.sound('chain');
        if (num(c.view.flag('living.buttonPresses')) >= 5) c.effects.discover('button');
      }),
  }),

  // -------------------------------------------------------------- Picture
  defineBehavior({
    id: 'picture.nudge',
    implements: ['INT-018', 'INT-053'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'picture'),
    react: (c) =>
      act('picture', 5200, (ctl) => {
        anim(c, 'picture', 'tilt');
        const nudges = num(c.view.flag('living.pictureNudges'));
        if (nudges >= 3 && !c.view.flag('living.keyholeRevealed')) {
          c.effects.setFlag('living.keyholeRevealed', true);
          c.effects.discover('keyhole');
          ctl.after(500, () => say(c, 'pim', ['you found the keyhole. now find the key.', 'oh no. you found it.'], 2600));
        }
        // the frame drifts back toward its usual crookedness
        return () => c.effects.setFlag('living.pictureTilt', -3);
      }),
  }),

  // ---------------------------------------------------------------- Clock
  defineBehavior({
    id: 'tick.refuse',
    implements: ['INT-023'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'tick') && c.view.count('tick') === 1,
    react: (c) =>
      act('tick', 1800, () => {
        face(c, 'tick', 'annoyed', 1600);
        anim(c, 'tick', 'shake');
        say(c, 'tick', ['not now. resting my hands.', 'no.'], 1700);
      }),
  }),
  defineBehavior({
    id: 'tick.spin',
    implements: ['INT-023', 'INT-030'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'tick') && c.view.count('tick') > 1,
    react: (c) =>
      act('tick', 1600, () => {
        const spins = num(c.view.flag('living.clockSpins')) + 1;
        c.effects.setFlag('living.clockSpins', spins);
        face(c, 'tick', 'surprised', 1400);
        anim(c, 'tick', 'dizzy');
        if (c.rng() < 0.5) say(c, 'tick', LINES.tickDizzy, 1600);
        if (spins === 12) c.effects.discover('midnight');
      }),
  }),

  // ---------------------------------------------------------------- Plant
  defineBehavior({
    id: 'plant.rustle',
    implements: ['INT-049'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    cooldownMs: 2500,
    when: (c) => isTarget(c, 'ferdinand') && c.event.payload.speed > 0.6,
    react: (c) => act('ferdinand', 800, () => void anim(c, 'ferdinand', 'wiggle'), { ambient: true }),
  }),
  defineBehavior({
    id: 'plant.click',
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'ferdinand'),
    react: (c) =>
      act('ferdinand', 1800, () => {
        anim(c, 'ferdinand', 'wiggle');
        say(c, 'ferdinand', LINES.plantRustle, 1800);
      }),
  }),
  defineBehavior({
    id: 'plant.droop',
    implements: ['INT-073'],
    on: ['USER_IDLE'],
    rooms: LIVING,
    priority: Priority.AMBIENT,
    react: (c) =>
      act(
        'ferdinand',
        120_000,
        (ctl) => {
          anim(c, 'ferdinand', 'droop', 120_000);
          ctl.after(1500, () => say(c, 'ferdinand', LINES.plantDroop, 2600));
          return () => send(c, 'ferdinand', { type: 'reset' });
        },
        { ambient: true },
      ),
  }),
  defineBehavior({
    id: 'plant.grow',
    implements: ['INT-054'],
    on: ['SECRET_DISCOVERED'],
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.firstTime,
    react: (c) =>
      act('ferdinand', 2600, (ctl) => {
        anim(c, 'ferdinand', 'grow');
        ctl.after(500, () => say(c, 'ferdinand', LINES.plantGrow, 2000));
      }),
  }),

  // ----------------------------------------------------------- Dust bunny
  defineBehavior({
    id: 'bunny.hide',
    implements: ['INT-005'],
    on: ['POINTER_ENTERED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 1200,
    when: (c) => isTarget(c, 'bunny'),
    react: (c) => act('bunny', 2000, () => void anim(c, 'bunny', 'hide', 1900)),
  }),
  defineBehavior({
    id: 'bunny.split',
    implements: ['INT-017'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    cooldownMs: 3500,
    when: (c) => isTarget(c, 'bunny'),
    react: (c) => act('bunny', 3400, () => void anim(c, 'bunny', 'split', 3300)),
  }),

  // -------------------------------------------------------- Empty space
  defineBehavior({
    id: 'wall.click',
    implements: ['INT-024'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    chance: 0.3,
    cooldownMs: 9000,
    when: (c) => isTarget(c, 'wall'),
    react: (c) => act('pim', 2000, () => void say(c, 'pim', LINES.emptyClick, 2000)),
  }),
  defineBehavior({
    id: 'wall.sticker',
    implements: ['INT-028'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 15_000,
    when: (c) => c.event.payload.target === 'wall' && c.event.payload.key === 'sticker',
    react: (c) => act('pim', 2000, () => void say(c, 'pim', ['ooh. a sticker.', 'Great-Aunt Pim would’ve had words about that.', 'the wall’s wearing a sticker now.'], 2000)),
  }),

  // ---------------------------------------------------------------- Title
  defineBehavior({
    id: 'title.poke',
    implements: ['INT-041'],
    on: ['KEY_PRESSED'],
    priority: Priority.DIRECT,
    when: (c) => 'oddlyalive'.includes(c.event.payload.key),
    react: (c) => act('title', 60, () => void send(c, 'title', { type: 'poke', key: c.event.payload.key })),
  }),
  defineBehavior({
    id: 'title.shoved',
    implements: ['INT-004'],
    on: ['OBJECT_STATE_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 30_000,
    when: (c) => c.event.payload.target === 'title',
    react: (c) => act('pim', 2000, () => void say(c, 'pim', ['careful with the letters.', 'you knocked the A.', 'the title is ticklish.'], 2000)),
  }),

  // ------------------------------------------------------------- Keyboard
  defineBehavior({
    id: 'seq.hello',
    implements: ['INT-042', 'INT-093'],
    on: ['KEY_SEQUENCE_DETECTED'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.sequence === 'hello',
    react: (c) =>
      act('room', 2800, (ctl) => {
        anim(c, 'pim', 'jump');
        face(c, 'pim', 'happy', 2400);
        say(c, 'pim', LINES.hello, 2400);
        ctl.after(200, () => anim(c, 'dot', 'jump'));
        ctl.after(400, () => face(c, 'tick', 'happy', 1800));
        ctl.after(600, () => anim(c, 'lumen', 'bounce'));
        ctl.after(800, () => anim(c, 'ferdinand', 'wiggle'));
        c.effects.discover('hello');
      }),
  }),
  defineBehavior({
    id: 'seq.wonk',
    implements: ['INT-046', 'INT-084'],
    on: ['KEY_SEQUENCE_DETECTED'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.sequence === 'wonk',
    react: (c) =>
      act('title', 12_000, () => {
        send(c, 'title', { type: 'poke', key: 'WONK' });
        c.effects.discover('wonk');
        return () => send(c, 'title', { type: 'poke', key: 'UNWONK' });
      }),
  }),
  defineBehavior({
    id: 'seq.shh',
    implements: ['INT-047'],
    on: ['KEY_SEQUENCE_DETECTED'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.sequence === 'shh',
    react: (c) => act('pim', 1500, () => void say(c, 'pim', LINES.shh, 1400)),
  }),
  defineBehavior({
    id: 'seq.dance',
    implements: ['INT-045'],
    on: ['KEY_SEQUENCE_DETECTED'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.sequence === 'dance',
    react: (c) =>
      act('room', 3400, (ctl) => {
        const beat = 420;
        const cast = ['pim', 'dot', 'lumen', 'tick', 'ferdinand'] as const;
        for (let i = 0; i < 6; i++) {
          ctl.after(i * beat, () => {
            for (const id of cast) anim(c, id, i % 2 ? 'wiggle' : 'bounce', beat);
            c.effects.sound('beat');
          });
        }
        c.effects.discover('dance');
      }),
  }),

  // ---------------------------------------------------------------- Scroll
  defineBehavior({
    id: 'scroll.up',
    implements: ['INT-034'],
    on: ['SCROLL_CHANGED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 25_000,
    when: (c) => c.event.payload.direction === 'up' && c.event.payload.depth > 0.1 && c.event.payload.depth < 0.6,
    react: (c) => act('pim', 2000, () => void say(c, 'pim', LINES.scrollUp, 2000)),
  }),
  defineBehavior({
    id: 'scroll.fast',
    implements: ['INT-031', 'INT-033'],
    on: ['SCROLL_CHANGED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 25_000,
    when: (c) => Math.abs(c.event.payload.velocity) > 4,
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'dizzy');
        say(c, 'dot', LINES.scrollFast, 1600);
      }),
  }),
  defineBehavior({
    id: 'scroll.end',
    implements: ['INT-038'],
    on: ['SCROLL_END_REACHED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    cooldownMs: 30_000,
    react: (c) =>
      act('inch', 2800, () => {
        anim(c, 'inch', 'wave');
        say(c, 'inch', LINES.pageEnd, 2800);
      }),
  }),
  defineBehavior({
    id: 'floorboard',
    implements: ['INT-091', 'INT-081'],
    on: ['OBJECT_CLICKED'],
    rooms: LIVING,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'floorboard'),
    react: (c) =>
      act('inch', 2600, () => {
        say(c, 'inch', ['you found the creaky one.', 'hi. I live here. rent is free.'], 2600);
        c.effects.discover('floorboard');
      }),
  }),

  // ------------------------------------------------------------ Revisits
  defineBehavior({
    id: 'room.revisit',
    implements: ['INT-035', 'INT-060'],
    on: ['ROOM_ENTERED'],
    rooms: LIVING,
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.visits >= 2,
    react: (c) =>
      act('pim', 3200, (ctl) => {
        const v = c.event.payload.visits;
        ctl.after(700, () =>
          say(
            c,
            'pim',
            v === 2 ? ['back already?', 'oh, you came back to the sofa.'] : v < 6 ? ['you keep coming back here. we like that.', 'our most loyal visitor.'] : ['you basically live here now.', 'should we get you a cushion?'],
            2400,
          ),
        );
      }),
  }),
  // ---- Phase 2: the attic ladder comes down
  defineBehavior({
    id: 'living.cord',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: ['living'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'cord' && c.event.payload.key === 'pulled',
    react: (c) =>
      act('pim', 2600, () => {
        face(c, 'pim', 'surprised', 1600);
        say(c, 'pim', LADDER_LINES, 2600);
      }),
  }),
  // ---- Phase 2: keeping Pim company without poking her
  defineBehavior({
    id: 'pim.gentle',
    on: ['POINTER_ENTERED'],
    rooms: ['living'],
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'pim') && c.view.count('hover:pim') >= 10 && c.view.count('pim') === 0 && !c.view.discovered('gentle-hands'),
    react: (c) =>
      act('pim', 3600, () => {
        face(c, 'pim', 'affectionate', 3200);
        say(c, 'pim', ['you haven’t poked me once. okay. there’s a cord in the ceiling.', 'you’re gentle. I’ll tell you something. Great-Aunt Pim wrote letters.'], 3600);
        c.effects.discover('gentle-hands');
      }),
  }),
];
