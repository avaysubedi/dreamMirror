import { Injectable } from '@angular/core';
import { VISUAL_CONFIG } from '../config/visual.config';
import { AudioFrame } from '../models/audio-frame';
import { createEffectStrengths, EffectId, EffectStrengths } from '../models/effect-id';
import { AudioBinding, WorldConfig } from '../models/world-config';

export interface EffectState {
  strengths: EffectStrengths;
  cameraMix: number;
  hueShift: number;
  particleSpeed: number;
  particleSize: number;
}

@Injectable({ providedIn: 'root' })
export class EffectEngineService {
  readonly state: EffectState = {
    strengths: createEffectStrengths(),
    cameraMix: 0.45,
    hueShift: 0,
    particleSpeed: 1,
    particleSize: 1,
  };

  private multipliers: Partial<Record<EffectId, number>> = {};

  setMultipliers(multipliers: Partial<Record<EffectId, number>>): void {
    this.multipliers = multipliers;
  }

  compute(world: WorldConfig, audio: AudioFrame): EffectState {
    const s = this.state.strengths;
    for (const key of Object.keys(s) as EffectId[]) {
      const base = world.effects[key] ?? 0;
      const mul = this.multipliers[key] ?? 1;
      s[key] = base * mul;
    }

    this.state.cameraMix = world.cameraMix;
    this.state.hueShift = 0;
    this.state.particleSpeed = world.particles.speed;
    this.state.particleSize = world.particles.size;

    this.applyBindings(world.audio.bass, audio.bass);
    this.applyBindings(world.audio.mid, audio.mid);
    this.applyBindings(world.audio.treble, audio.treble);
    this.applyBindings(world.audio.peaks, audio.beat);
    this.applyBindings(world.audio.drops, audio.drop);

    this.state.cameraMix = Math.max(VISUAL_CONFIG.minCameraPresence, Math.min(1, this.state.cameraMix));
    return this.state;
  }

  private applyBindings(bindings: AudioBinding[], amount: number): void {
    for (const binding of bindings) {
      const delta = binding.amount * amount;
      if (binding.effect === 'cameraMix') {
        this.state.cameraMix += delta;
      } else if (binding.effect === 'hueShift') {
        this.state.hueShift += delta * 0.15;
      } else if (binding.effect === 'particleSpeed') {
        this.state.particleSpeed += delta;
      } else if (binding.effect === 'particleSize') {
        this.state.particleSize += delta;
      } else {
        this.state.strengths[binding.effect] = Math.min(1.4, this.state.strengths[binding.effect] + delta);
      }
    }
  }
}
