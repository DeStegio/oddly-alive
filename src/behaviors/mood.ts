import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import type { Mood } from '../engine/types';
import { NIMBUS_PIN, NIMBUS_REFUSE, NIMBUS_VISIT, WEATHER_REMARKS } from '../content/weather';
import { isWeather } from '../engine/weather';
import { act, anim, face, isTarget, say } from './helpers';

const baro = (c: { event: { payload: unknown } }, key: string) => {
  const p = c.event.payload as { target?: string; key?: string };
  return p.target === 'barometer' && p.key === key;
};

const MOOD = ['mood'] as const;
const used = (c: { event: { payload: unknown } }, id: string) => {
  const p = c.event.payload as { target?: string; key?: string };
  return p.target === `mood:${id}` && p.key === 'use';
};

const WEATHER_LINES: Record<Mood, string[]> = {
  neutral: ['clear skies. nothing to report.', 'dry, settled, a bit dull. lovely.'],
  curious: ['a balloon going over. where’s it off to.', 'partly curious, clearing later.'],
  playful: ['kite weather.', 'sunny spells. the kite’s out.'],
  shy: ['the sun is hiding. relatable.', 'a bit hazy. don’t look at me.'],
  annoyed: ['it’s raining. on purpose.', 'grumble grumble. that’s thunder. probably.'],
  excited: ['IT’S RAINING CONFETTI.', 'confetti, heavy at times.'],
  sleepy: ['night already? zzz.', 'the moon came early.'],
  mischievous: ['the moon is up to something.', 'sparkly. sneaky.'],
  confused: ['the rainbow is upside down. is that allowed?', 'I’ve no idea what this is. sorry. live television.'],
  affectionate: ['warm sunset. two birds on the wire.', 'a lovely evening, really.'],
};

/** The Mood Room: windowsill objects push the house's mood; Nimbus narrates the weather. */
export const moodBehaviors = [
  defineBehavior({
    id: 'mood.tea',
    implements: ['INT-080'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'tea'),
    react: (c) =>
      act('nimbus', 2200, () => {
        face(c, 'nimbus', 'affectionate', 2000);
        say(c, 'nimbus', ['ahh. tea. pressure rising nicely.', 'outlook: calm, with sips.'], 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.horn',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'horn') && c.view.mood !== 'annoyed',
    react: (c) =>
      act('nimbus', 1800, () => {
        face(c, 'nimbus', 'excited', 1600);
        anim(c, 'nimbus', 'jump');
        say(c, 'nimbus', ['TOOT. that’s a front coming in.', 'gusty and festive, locally.'], 1600);
      }),
  }),
  defineBehavior({
    id: 'mood.horn.annoyed',
    implements: ['INT-072'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'horn') && c.view.mood === 'annoyed',
    react: (c) =>
      act('nimbus', 2000, () => {
        face(c, 'nimbus', 'annoyed', 1800);
        anim(c, 'nimbus', 'shake');
        say(c, 'nimbus', ['do not toot at me during a low.', 'that is not helping the isobars.'], 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.blanket',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'blanket') && c.view.recent('mood:tea', 30_000) === 0,
    react: (c) =>
      act('nimbus', 2200, () => {
        face(c, 'nimbus', 'sleepy', 2000);
        say(c, 'nimbus', ['patchy blanket, clearing to cosy.', 'mm. warm front.'], 1800);
      }),
  }),
  defineBehavior({
    id: 'mood.nap',
    implements: ['INT-092', 'INT-055'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'blanket') && c.view.recent('mood:tea', 30_000) > 0,
    react: (c) =>
      act('nimbus', 25_000, (ctl) => {
        c.effects.setFlag('mood.napping', true);
        c.effects.nudge({ fatigue: 0.3, stimulation: -0.3 });
        ctl.after(600, () => say(c, 'nimbus', ['tea and a blanket. that’s me done for the day.', 'closing down for the night. goodnight.'], 2400));
        c.effects.discover('nap');
        return () => c.effects.setFlag('mood.napping', false);
      }),
  }),
  defineBehavior({
    id: 'mood.mirror',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'mirror'),
    weight: (c) => (c.view.recent('mood:mirror', 20_000) >= 3 ? 0 : 1),
    react: (c) =>
      act('nimbus', 2200, () => {
        face(c, 'nimbus', 'confused', 2000);
        say(c, 'nimbus', ['who is that handsome cloud?', 'there are two of me now.'], 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.mirror.wink',
    implements: ['INT-086', 'INT-083'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    weight: (c) => (c.view.recent('mood:mirror', 20_000) >= 3 ? 50 : 0),
    when: (c) => used(c, 'mirror'),
    react: (c) =>
      act('nimbus', 2600, () => {
        face(c, 'nimbus', 'mischievous', 2400);
        say(c, 'nimbus', ['…did my reflection just wink?', 'the mirror cloud winked. I saw it.'], 2600);
        c.effects.discover('mirror');
      }),
  }),
  defineBehavior({
    id: 'mood.feather',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'feather'),
    react: (c) =>
      act('nimbus', 1800, () => {
        face(c, 'nimbus', 'mischievous', 1600);
        anim(c, 'nimbus', 'wiggle');
        say(c, 'nimbus', ['hehe. stop. no, carry on.', 'a feather. I’m very ticklish at altitude.'], 1600);
      }),
  }),
  defineBehavior({
    id: 'mood.letter',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    group: 'mood.obj',
    priority: Priority.DIRECT,
    when: (c) => used(c, 'letter'),
    react: (c) =>
      act('nimbus', 2600, () => {
        face(c, 'nimbus', 'affectionate', 2400);
        say(c, 'nimbus', ['“you are a very good cloud.” …for me?', 'someone wrote me a letter.'], 2600);
      }),
  }),
  defineBehavior({
    id: 'mood.nimbus.click',
    implements: ['INT-072'],
    on: ['OBJECT_CLICKED'],
    rooms: MOOD,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'nimbus'),
    react: (c) =>
      act('nimbus', 1400, () => {
        anim(c, 'nimbus', c.view.mood === 'excited' || c.view.mood === 'playful' ? 'bounce' : 'squish');
        if (c.rng() < 0.5) say(c, 'nimbus', WEATHER_LINES[c.view.mood], 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.nimbus.stared',
    implements: ['INT-002'],
    on: ['POINTER_STARE'],
    rooms: MOOD,
    priority: Priority.CHARACTER,
    cooldownMs: 10_000,
    when: (c) => isTarget(c, 'nimbus'),
    react: (c) =>
      act('nimbus', 2200, () => {
        face(c, 'nimbus', 'shy', 2000);
        say(c, 'nimbus', ['clouds get shy too, you know.'], 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.weather.change',
    implements: ['INT-079', 'INT-048'],
    on: ['MOOD_CHANGED'],
    rooms: MOOD,
    priority: Priority.CHARACTER,
    cooldownMs: 3000,
    react: (c) => act('nimbus', 2600, (ctl) => ctl.after(900, () => say(c, 'nimbus', WEATHER_LINES[c.event.payload.to], 2400))),
  }),
  defineBehavior({
    id: 'mood.moodswing',
    implements: ['INT-083'],
    on: ['MOOD_CHANGED'],
    priority: Priority.RARE,
    when: (c) => c.view.moodsSeen() >= 6 && !c.view.discovered('moodswing'),
    react: (c) => act('ambient:moodswing', 100, () => void c.effects.discover('moodswing')),
  }),
  defineBehavior({
    id: 'mood.welcome',
    implements: ['INT-035'],
    on: ['ROOM_ENTERED'],
    rooms: MOOD,
    priority: Priority.CHARACTER,
    react: (c) =>
      act('nimbus', 2800, (ctl) =>
        ctl.after(700, () => say(c, 'nimbus', c.event.payload.visits > 1 ? ['back to check the weather?', 'still me. still weather.'] : ['today’s weather: me.', 'hello! I’m the forecast.'], 2400)),
      ),
  }),

  // ---- the barometer (Phase 2): Nimbus reports the weather you pinned
  defineBehavior({
    id: 'mood.baro.pin',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    priority: Priority.DIRECT,
    when: (c) => baro(c, 'pin') && isWeather(c.event.payload.value),
    react: (c) => {
      const w = c.event.payload.value;
      return act('nimbus', 2400, () => {
        face(c, 'nimbus', w === 'storm' ? 'annoyed' : w === 'snow' || w === 'rainbow' ? 'excited' : 'happy', 2000);
        if (isWeather(w)) say(c, 'nimbus', NIMBUS_PIN[w], 2400);
      });
    },
  }),
  defineBehavior({
    id: 'mood.baro.refuse',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: MOOD,
    priority: Priority.DIRECT,
    when: (c) => baro(c, 'refused'),
    react: (c) =>
      act('nimbus', 2200, () => {
        face(c, 'nimbus', 'annoyed', 2000);
        anim(c, 'nimbus', 'shake');
        say(c, 'nimbus', NIMBUS_REFUSE, 2200);
      }),
  }),
  // ---- Nimbus out on a visit (any room)
  defineBehavior({
    id: 'nimbus.visit',
    on: ['OBJECT_STATE_CHANGED'],
    priority: Priority.CHARACTER,
    when: (c) => isTarget(c, 'nimbus') && c.event.payload.key === 'visit',
    react: (c) =>
      act('nimbus', 2600, (ctl) => {
        face(c, 'nimbus', 'happy', 2200);
        say(c, 'nimbus', NIMBUS_VISIT, 2400);
        if (c.view.room === 'living') ctl.after(1800, () => say(c, 'pim', ['Nimbus? indoors?', 'oh. it’s raining on the rug.'], 2200));
      }),
  }),
  // ---- the Living Room notices the weather turn
  defineBehavior({
    id: 'living.weather.remark',
    on: ['WEATHER_CHANGED'],
    rooms: ['living'],
    priority: Priority.AMBIENT,
    cooldownMs: 20_000,
    when: (c) => WEATHER_REMARKS[c.event.payload.to] !== undefined,
    react: (c) => {
      const r = WEATHER_REMARKS[c.event.payload.to]!;
      return act(r.who, 2600, () => void say(c, r.who, r.lines, 2600), { ambient: true });
    },
  }),
];
