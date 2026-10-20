export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x9e3779b9;
    }
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }

  weightedPick<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
    let cursor = this.next() * total;
    for (const item of items) {
      cursor -= Math.max(0, weight(item));
      if (cursor <= 0) {
        return item;
      }
    }
    return items[items.length - 1]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }
}

export function hueShiftRgb(rgb: [number, number, number], turns: number): [number, number, number] {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  h = (h + turns) % 1;
  if (h < 0) {
    h += 1;
  }
  return hslToRgb(h, s, l);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    return [l, l, l];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}
