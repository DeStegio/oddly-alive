import type { AgentDef } from './types';

/**
 * The house's characters as agents: what they need, how fast it builds, and
 * how they feel about each other. Temperaments follow the existing cast:
 * Dot causes trouble, Pim wants a quiet sit, Tick wants things where they
 * belong, Lumen wants to be looked at, Ferdinand watches the light.
 */
export const CAST: AgentDef[] = [
  { id: 'dot', start: { play: 0.5, attention: 0.3 }, growth: { play: 0.45, attention: 0.2, curiosity: 0.2 }, regard: { tick: -0.2, pim: 0.5, lumen: 0.2 } },
  { id: 'pim', start: { rest: 0.4 }, growth: { rest: 0.3, curiosity: 0.1 }, regard: { dot: 0.3, tick: 0.1, lumen: -0.1 } },
  { id: 'tick', start: { order: 0.5 }, growth: { order: 0.35 }, regard: { dot: -0.4, pim: 0.2 } },
  { id: 'lumen', start: { attention: 0.4 }, growth: { attention: 0.3 }, regard: { pim: 0.4, dot: 0.1, tick: -0.2 } },
  { id: 'nimbus', start: { attention: 0.4, play: 0.3 }, growth: { attention: 0.25, play: 0.2 }, regard: { pim: 0.3, dot: 0.2 } },
  { id: 'ferdinand', start: { curiosity: 0.3 }, growth: { curiosity: 0.2 }, regard: { lumen: 0.5 } },
];
