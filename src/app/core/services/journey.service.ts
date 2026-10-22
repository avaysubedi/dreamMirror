import { Injectable, computed, inject, signal } from '@angular/core';
import { ColorPalette, WorldConfig } from '../models/world-config';
import { SeededRng } from '../utils/seeded-rng';
import { EffectEngineService } from './effect-engine.service';
import { RandomizationService } from './randomization.service';
import { TransitionManagerService } from './transition-manager.service';
import { VisualEngineService } from './visual-engine.service';
import { WorldManagerService } from './world-manager.service';
import { WorldEventService } from './world-event.service';

export type JourneyStatus = 'idle' | 'running' | 'paused' | 'complete';

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private readonly worlds = inject(WorldManagerService);
  private readonly transitions = inject(TransitionManagerService);
  private readonly effects = inject(EffectEngineService);
  private readonly random = inject(RandomizationService);
  private readonly engine = inject(VisualEngineService);
  private readonly events = inject(WorldEventService);

  readonly status = signal<JourneyStatus>('idle');
  readonly seed = signal(0);
  readonly currentWorld = computed(() => this.worlds.current());

  private rng: SeededRng | null = null;
  private hueTurns = 0;

  prepare(): WorldConfig[] {
    const { rng, variation } = this.random.create();
    this.rng = rng;
    this.seed.set(variation.seed);
    this.hueTurns = variation.hueTurns;
    this.effects.setMultipliers(variation.effectMultipliers);
    const playlist = this.worlds.buildJourney(rng);
    this.applyWorld(playlist[0]!);
    this.status.set('idle');
    return playlist;
  }

  start(): void {
    if (!this.rng) {
      this.prepare();
    }
    this.worlds.begin();
    this.status.set('running');
    this.engine.start();
  }

  pause(): void {
    if (this.status() !== 'running') {
      return;
    }
    this.status.set('paused');
  }

  resume(): void {
    if (this.status() === 'paused') {
      this.status.set('running');
    }
  }

  tick(now: number, drop: number): void {
    if (this.status() !== 'running') {
      return;
    }
    const event = this.events.tick(now, this.currentWorld().id, this.rng!);
    this.engine.setWorldEvent(event.type, event.intensity);
    if (this.worlds.shouldAdvance(now, drop) && !this.transitions.active()) {
      this.advance();
    }
    if (this.worlds.complete()) {
      this.status.set('complete');
    }
  }

  nextWorld(): void {
    this.advance();
  }

  randomWorld(): void {
    if (!this.rng) {
      return;
    }
    const world = this.worlds.randomWorld(this.rng);
    this.crossfadeTo(world, () => undefined);
  }

  surprise(): 'world' | 'transformation' | 'event' {
    if (!this.rng) this.prepare();
    const choice = this.rng!.int(0, 2);
    if (choice === 0) {
      this.randomWorld();
      return 'world';
    }
    if (choice === 1) {
      const current = Number(localStorage.getItem('dm-transform') || '0');
      let next = this.rng!.int(1, 7);
      if (next === current) next = (next % 7) + 1;
      this.engine.setTransformation(next);
      return 'transformation';
    }
    const event = this.events.triggerNow(this.currentWorld().id, performance.now(), this.rng!);
    this.engine.setWorldEvent(event.type, event.intensity);
    return 'event';
  }

  private advance(): void {
    const upcoming = this.worlds.playlist()[this.worlds.cursor() + 1];
    if (!upcoming) {
      this.worlds.next();
      this.status.set('complete');
      return;
    }
    this.crossfadeTo(upcoming, () => this.worlds.next());
  }

  private crossfadeTo(world: WorldConfig, onMid?: () => void): void {
    const from = this.worlds.current();
    this.transitions.play(from, this.rng?.pick(from.preferredTransitions), () => {
      onMid?.();
      this.applyWorld(world);
    });
  }

  private applyWorld(world: WorldConfig): void {
    const tinted: WorldConfig = {
      ...world,
      palette: this.tint(world.palette),
    };
    this.engine.setWorld(tinted);
  }

  private tint(palette: ColorPalette): ColorPalette {
    return this.random.tintPalette(palette, this.hueTurns);
  }
}
