import { Injectable, computed, signal } from '@angular/core';
import { WorldConfig } from '../models/world-config';
import { WORLD_REGISTRY, worldById } from '../../visual/worlds/world-registry';
import { SeededRng } from '../utils/seeded-rng';

@Injectable({ providedIn: 'root' })
export class WorldManagerService {
  readonly playlist = signal<WorldConfig[]>([]);
  readonly cursor = signal(0);
  readonly current = computed(() => this.playlist()[this.cursor()] ?? WORLD_REGISTRY[0]!);
  readonly complete = signal(false);

  private durations: number[] = [];
  private worldStartedAt = 0;
  private cooldownUntil = 0;

  buildJourney(rng: SeededRng): WorldConfig[] {
    const opener = WORLD_REGISTRY.find((w) => w.isOpener)!;
    const finale = WORLD_REGISTRY.find((w) => w.isFinale)!;
    const middle = WORLD_REGISTRY.filter((w) => !w.isOpener && !w.isFinale);
    const shuffled = rng.shuffle(middle);
    const take = 6 + rng.int(0, 2);
    const sequence = [opener, ...shuffled.slice(0, take), finale];
    this.playlist.set(sequence);
    this.durations = sequence.map((world) => rng.range(world.durationRangeMs[0], world.durationRangeMs[1]));
    this.cursor.set(0);
    this.complete.set(false);
    this.worldStartedAt = performance.now();
    this.cooldownUntil = 0;
    return sequence;
  }

  begin(): void {
    this.worldStartedAt = performance.now();
    this.complete.set(false);
  }

  next(): WorldConfig | null {
    if (this.cursor() >= this.playlist().length - 1) {
      this.complete.set(true);
      return null;
    }
    this.cursor.update((value) => value + 1);
    this.worldStartedAt = performance.now();
    this.cooldownUntil = performance.now() + 8000;
    return this.current();
  }

  jumpTo(id: string): WorldConfig | null {
    const world = worldById(id);
    if (!world) {
      return null;
    }
    const list = this.playlist();
    const idx = list.findIndex((item) => item.id === id);
    if (idx >= 0) {
      this.cursor.set(idx);
    } else {
      const copy = [...list];
      const insertAt = Math.min(this.cursor() + 1, copy.length);
      copy.splice(insertAt, 0, world);
      this.playlist.set(copy);
      this.durations.splice(insertAt, 0, (world.durationRangeMs[0] + world.durationRangeMs[1]) / 2);
      this.cursor.set(insertAt);
    }
    this.worldStartedAt = performance.now();
    this.cooldownUntil = performance.now() + 8000;
    this.complete.set(!!world.isFinale);
    return world;
  }

  randomWorld(rng: SeededRng): WorldConfig {
    const options = this.playlist().filter((world) => !world.isFinale && world.id !== this.current().id);
    const pick = rng.weightedPick(options.length ? options : this.playlist(), (world) => world.narrativeWeight);
    this.jumpTo(pick.id);
    return pick;
  }

  shouldAdvance(now: number, drop: number): boolean {
    if (this.complete()) {
      return false;
    }
    const elapsed = now - this.worldStartedAt;
    const duration = this.durations[this.cursor()] ?? 30000;
    if (elapsed > duration) {
      return true;
    }
    if (drop > 0.75 && now > this.cooldownUntil && elapsed > 8000) {
      return true;
    }
    return false;
  }
}
