import type { ButtonMode, ButtonOutcome } from '../rooms/LivingRoom/button/buttonMachine';

/**
 * The button in the Living Room. It mostly acts (ducks, flinches, builds a
 * glass box around itself); it speaks rarely and briefly (VOICE.md).
 */
export const BUTTON_PLATE: Record<ButtonMode, string> = {
  calm: 'do not press',
  wary: 'please do not',
  bracing: 'i said no',
  shielded: 'i said no',
  open: 'okay fine',
  lowering: 'okay fine',
  hiding: '',
  repairing: 'one moment',
};
/** The plate once it has come to like you. */
export const BUTTON_PLATE_FRIENDLY = 'press me';

/** Lines for some outcomes. Most outcomes say nothing on purpose. */
export const BUTTON_LINES: Partial<Record<ButtonOutcome, readonly string[]>> = {
  bracing: ['no.', 'right. that’s it.', 'hold on, hold on.'],
  snapped: ['not yet.', 'nope.', 'ask me again in a minute.'],
  opened: ['fine. gently.', 'alright. one.', 'since you asked nicely.'],
  fell: ['hey!', 'that was load-bearing!'],
  caught: ['that’s cheating.', 'I wasn’t ready.'],
  lowered: ['…alright.', 'I suppose.'],
  pried: ['Dot!', 'oi.'],
};

/** Tick, putting the glass back where it belongs. */
export const TICK_PUTS_BACK = ['that goes back on.', 'leave it, Dot.', 'there. as it was.'];
/** Dot, mid-mischief. */
export const DOT_PRIES = ['hup.', 'got it.'];

export const GLASS_LABEL = 'Protective glass over the button. Drag it up, or press the up arrow, to lift it.';
export const boltLabel = (side: 'left' | 'right', turns: number) => `Bolt on the ${side} bracket (${turns ? `${turns} turn${turns > 1 ? 's' : ''} from loose` : 'loose'})`;
