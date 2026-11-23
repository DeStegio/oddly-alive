import { describe, expect, it } from 'vitest';
import { HINT_STEPS_MS, hintRung } from './hints';

describe('the hint ladder', () => {
  it('climbs at 30 s, 60 s and 120 s without progress', () => {
    expect(hintRung(0)).toBe(0);
    expect(hintRung(29_999)).toBe(0);
    expect(hintRung(HINT_STEPS_MS[0])).toBe(1);
    expect(hintRung(HINT_STEPS_MS[1])).toBe(2);
    expect(hintRung(HINT_STEPS_MS[2] + 1)).toBe(3);
  });
});
