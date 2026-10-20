import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldManagerService } from './world-manager.service';
import { SeededRng } from '../utils/seeded-rng';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';

describe('WorldManagerService', () => {
  it('should initialize and contain all 11 worlds in registry', () => {
    expect(WORLD_REGISTRY.length).toBe(11);
  });

  it('builds a journey starting with opener and ending with finale', () => {
    const service = TestBed.inject(WorldManagerService);
    const rng = new SeededRng(42);
    const playlist = service.buildJourney(rng);

    expect(playlist.length).toBeGreaterThanOrEqual(8);
    expect(playlist[0]!.isOpener).toBe(true);
    expect(playlist[playlist.length - 1]!.isFinale).toBe(true);
  });

  it('advances through playlist correctly', () => {
    const service = TestBed.inject(WorldManagerService);
    const rng = new SeededRng(99);
    const playlist = service.buildJourney(rng);

    expect(service.cursor()).toBe(0);
    expect(service.current().id).toBe(playlist[0]!.id);

    service.next();
    expect(service.cursor()).toBe(1);
    expect(service.current().id).toBe(playlist[1]!.id);
  });

  it('jumps to world by id', () => {
    const service = TestBed.inject(WorldManagerService);
    const rng = new SeededRng(77);
    service.buildJourney(rng);

    const world = service.jumpTo('fractal-temple');
    expect(world).toBeTruthy();
    expect(service.current().id).toBe('fractal-temple');
  });
});
