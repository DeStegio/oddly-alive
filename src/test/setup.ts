import '@testing-library/jest-dom/vitest';

// jsdom has no canvas: say so quietly (components draw nothing and carry on)
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true });
}
