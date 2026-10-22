import { Injectable } from '@angular/core';
import { SeededRng } from '../utils/seeded-rng';

export const WORLD_EVENT_IDS = ['banana', 'ufo', 'cat', 'duck', 'portal', 'mothership', 'laser', 'anomaly', 'pizza', 'rain'] as const;
export type WorldEventId = typeof WORLD_EVENT_IDS[number];
export interface ActiveWorldEvent { type: WorldEventId | null; intensity: number; }

const EVENTS_BY_WORLD: Record<string, readonly WorldEventId[]> = {
  'cosmic-birth': ['portal', 'anomaly', 'mothership'],
  'cloud-kingdom': ['laser', 'mothership', 'anomaly'],
  'fractal-temple': ['portal', 'anomaly', 'rain'],
  'rainbow-warp': ['rain', 'banana', 'portal'],
  'interdimensional-eyes': ['anomaly', 'portal', 'laser'],
  'astral-ocean': WORLD_EVENT_IDS,
  'banana-dimension': ['banana', 'rain', 'portal'],
  'ufo-invasion': ['ufo', 'mothership', 'portal', 'laser'],
  'cat-dimension': ['cat', 'laser', 'portal'],
  'duck-world': ['duck', 'rain', 'portal'],
  'pizza-universe': ['pizza', 'portal', 'anomaly'],
  'meme-mix': WORLD_EVENT_IDS,
  'meme-world': WORLD_EVENT_IDS,
  'glitch-reality': ['anomaly', 'portal', 'laser'],
  'cyber-dimension': ['laser', 'mothership', 'anomaly'],
  'psychedelic-jungle': ['rain', 'banana', 'portal'],
};

@Injectable({ providedIn: 'root' })
export class WorldEventService {
  private worldId = '';
  private startsAt = 0;
  private endsAt = 0;
  private nextAt = 0;
  private active: WorldEventId | null = null;

  triggerNow(worldId: string, now: number, rng: SeededRng): ActiveWorldEvent {
    this.worldId = worldId;
    const options = EVENTS_BY_WORLD[worldId] ?? ['portal', 'anomaly'];
    this.active = rng.pick(options);
    this.startsAt = now;
    this.endsAt = now + rng.range(6500, 9500);
    this.nextAt = this.endsAt;
    return { type: this.active, intensity: 1 };
  }

  tick(now: number, worldId: string, rng: SeededRng): ActiveWorldEvent {
    if (worldId !== this.worldId) {
      this.worldId = worldId;
      this.active = null;
      this.startsAt = this.endsAt = 0;
      this.nextAt = now + rng.range(9000, 17000);
    }

    if (this.active && now >= this.endsAt) {
      this.active = null;
      this.nextAt = now + rng.range(20000, 39000);
    }

    if (!this.active && now >= this.nextAt) {
      const options = EVENTS_BY_WORLD[worldId] ?? ['portal', 'anomaly'];
      this.active = rng.pick(options);
      this.startsAt = now;
      this.endsAt = now + rng.range(6500, 9500);
    }

    if (!this.active) return { type: null, intensity: 0 };
    const progress = (now - this.startsAt) / (this.endsAt - this.startsAt);
    const envelope = Math.min(1, progress * 3.5, (1 - progress) * 3.5);
    return { type: this.active, intensity: Math.max(0, envelope) };
  }
}
