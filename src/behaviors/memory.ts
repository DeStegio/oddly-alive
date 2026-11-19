import { LINES } from '../content/lines';
import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, say } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

/** Returning visitors are recognized (locally) and greeted a little differently. */
export const memoryBehaviors = [
  defineBehavior({
    id: 'return.greet',
    implements: ['INT-096', 'INT-035'],
    on: ['MEMORY_RESTORED'],
    group: 'return',
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.returning && c.event.payload.visits < 3,
    react: (c) =>
      act('pim', 3000, () => {
        face(c, 'pim', 'happy', 2600);
        say(c, 'pim', c.event.payload.awayMs > DAY ? ['it’s been a while! the dust bunny missed you.', 'oh! you came back. we kept your spot.'] : LINES.returning, 2800);
      }),
  }),
  defineBehavior({
    id: 'return.surprise',
    implements: ['INT-090', 'INT-096'],
    on: ['MEMORY_RESTORED'],
    group: 'return',
    priority: Priority.CHARACTER,
    when: (c) => c.event.payload.returning && c.event.payload.visits >= 3,
    react: (c) =>
      act('room', 4200, (ctl) => {
        anim(c, 'dot', 'jump');
        face(c, 'pim', 'excited', 2400);
        c.effects.setFlag('living.plantBloom', true);
        say(c, 'pim', ['you came back again! Ferdinand bloomed for you.', `visit number ${c.event.payload.visits}. we’re honoured.`], 3200);
        ctl.after(1600, () => anim(c, 'ferdinand', 'grow'));
      }),
  }),
  defineBehavior({
    id: 'return.favorite',
    implements: ['INT-099'],
    on: ['MEMORY_RESTORED'],
    priority: Priority.AMBIENT,
    when: (c) => c.event.payload.returning && c.view.favorite() !== null,
    react: (c) => {
      const fav = c.view.favorite();
      const lines: Record<string, [Parameters<typeof say>[1], string[]]> = {
        lumen: ['lumen', ['oh no. it’s the switch-flicker.', 'I remember you. you like my switch.']],
        button: ['button', ['you again. please. not the button.']],
        dot: ['dot', ['my favourite cursor is back!']],
        tick: ['tick', ['the winder returns. I’m awake. I’m awake.']],
        ferdinand: ['ferdinand', ['my favourite leaf-toucher!']],
        pim: ['pim', ['you always come say hi to me. I noticed.']],
      };
      const entry = fav ? lines[fav] : undefined;
      if (!entry) return null;
      const [who, text] = entry;
      return act(`${who}:fav`, 3200, (ctl) => ctl.after(2800, () => say(c, who, text, 2600)), { ambient: true });
    },
  }),
];
