import { describe, expect, it } from 'vitest';
import { SeededRng } from './seeded-rng';

describe('SeededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    expect(a.next()).toBe(b.next());
    expect(a.range(1, 10)).toBe(b.range(1, 10));
  });

  it('generates numbers within specified range', () => {
    const rng = new SeededRng(12345);
    for (let i = 0; i < 20; i++) {
      const val = rng.range(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(15);
    }
  });

  it('shuffles arrays deterministically', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const r1 = new SeededRng(99);
    const r2 = new SeededRng(99);
    expect(r1.shuffle(arr)).toEqual(r2.shuffle(arr));
  });
});
