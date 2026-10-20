import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EffectEngineService } from './effect-engine.service';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';
import { createAudioFrame } from '../models/audio-frame';

describe('EffectEngineService', () => {
  it('computes effect state based on world and audio frame', () => {
    const service = TestBed.inject(EffectEngineService);
    const world = WORLD_REGISTRY[0]!;
    const audio = createAudioFrame();
    audio.bass = 0.8;
    audio.treble = 0.6;
    audio.beat = 0.9;

    const state = service.compute(world, audio);
    expect(state).toBeTruthy();
    expect(state.strengths).toBeTruthy();
    expect(typeof state.cameraMix).toBe('number');
    expect(state.cameraMix).toBeGreaterThan(0);
  });

  it('respects effect multipliers', () => {
    const service = TestBed.inject(EffectEngineService);
    const world = WORLD_REGISTRY[2]!; // Fractal Temple
    service.setMultipliers({ kaleidoscope: 1.5 });

    const audio = createAudioFrame();
    const state = service.compute(world, audio);
    const baseVal = world.effects.kaleidoscope ?? 0;
    expect(state.strengths.kaleidoscope).toBeCloseTo(baseVal * 1.5, 2);
  });
});
