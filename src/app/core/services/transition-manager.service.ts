import { Injectable, signal } from '@angular/core';
import { VISUAL_CONFIG } from '../config/visual.config';
import { TransitionId, TRANSITION_IDS } from '../models/transition-id';
import { WorldConfig } from '../models/world-config';

@Injectable({ providedIn: 'root' })
export class TransitionManagerService {
  readonly active = signal(false);
  readonly id = signal<TransitionId>('light-burst');
  readonly progress = signal(0);
  readonly index = signal(0);

  private startTime = 0;
  private duration = 1600;
  private midpointCallback: (() => void) | null = null;
  private flipped = false;

  play(world: WorldConfig, preferred?: TransitionId, onMidpoint?: () => void): void {
    const id = preferred ?? world.preferredTransitions[0] ?? 'cosmic-flash';
    this.id.set(id);
    this.index.set(Math.max(0, TRANSITION_IDS.indexOf(id)));
    this.duration = lerp(VISUAL_CONFIG.transitionDurationMs[0], VISUAL_CONFIG.transitionDurationMs[1], 0.5);
    this.startTime = performance.now();
    this.flipped = false;
    this.midpointCallback = onMidpoint ?? null;
    this.active.set(true);
    this.progress.set(0);
  }

  tick(now: number): void {
    if (!this.active()) {
      this.progress.set(0);
      return;
    }
    const t = (now - this.startTime) / this.duration;
    if (!this.flipped && t >= 0.5) {
      this.flipped = true;
      this.midpointCallback?.();
    }
    if (t >= 1) {
      this.active.set(false);
      this.progress.set(0);
      return;
    }
    this.progress.set(Math.min(1, t));
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
