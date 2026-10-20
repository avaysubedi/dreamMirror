import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { VISUAL_CONFIG } from '../config/visual.config';
import { AudioFrame } from '../models/audio-frame';
import { WorldConfig } from '../models/world-config';
import { PARTICLE_FRAG, PARTICLE_VERT } from '../../visual/shaders/particles.glsl';

@Injectable({ providedIn: 'root' })
export class ParticleSystemService {
  group: THREE.Points | null = null;

  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private velocities = new Float32Array(VISUAL_CONFIG.particleCount * 3);
  private baseColor = new THREE.Color();
  private accentColor = new THREE.Color();

  create(): THREE.Points {
    this.dispose();
    const count = VISUAL_CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, positions, 8);
      sizes[i] = 0.6 + Math.random() * 1.8;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry = geometry;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPointScale: { value: 1 },
        uBass: { value: 0 },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.group = new THREE.Points(geometry, this.material);
    this.group.frustumCulled = false;
    return this.group;
  }

  configure(world: WorldConfig): void {
    this.baseColor.setRGB(world.palette.primary[0], world.palette.primary[1], world.palette.primary[2]);
    this.accentColor.setRGB(world.palette.accent[0], world.palette.accent[1], world.palette.accent[2]);
    if (this.material) {
      this.material.uniforms['uPointScale']!.value = world.particles.size;
    }
  }

  update(dt: number, world: WorldConfig, audio: AudioFrame, speedMul: number, sizeMul: number): void {
    if (!this.geometry || !this.material) {
      return;
    }
    this.material.uniforms['uBass']!.value = audio.bass;
    this.material.uniforms['uPointScale']!.value = world.particles.size * sizeMul;

    const positions = this.geometry.attributes['position'] as THREE.BufferAttribute;
    const colors = this.geometry.attributes['aColor'] as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    const colorArr = colors.array as Float32Array;
    const count = VISUAL_CONFIG.particleCount;
    const burst = audio.beat * (world.effects.particleBursts ?? 0.2);
    const speed = world.particles.speed * speedMul * (1 + audio.energy);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.integrate(world, array, i3, dt, speed, burst, audio);
      if (outOfBounds(array, i3, world.particles.preset)) {
        this.resetParticle(i, array, spawnRadius(world));
      }
      const mix = (i % 5) / 5;
      colorArr[i3] = this.baseColor.r * (1 - mix) + this.accentColor.r * mix;
      colorArr[i3 + 1] = this.baseColor.g * (1 - mix) + this.accentColor.g * mix;
      colorArr[i3 + 2] = this.baseColor.b * (1 - mix) + this.accentColor.b * mix;
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    this.geometry = null;
    this.material = null;
    this.group = null;
  }

  private integrate(
    world: WorldConfig,
    pos: Float32Array,
    i3: number,
    dt: number,
    speed: number,
    burst: number,
    audio: AudioFrame,
  ): void {
    const preset = world.particles.preset;
    const vx = this.velocities[i3]!;
    const vy = this.velocities[i3 + 1]!;
    const vz = this.velocities[i3 + 2]!;

    if (preset === 'stars' || preset === 'stardust') {
      pos[i3 + 2] += (2.5 * speed + burst * 4) * dt;
    } else if (preset === 'feathers' || preset === 'petals' || preset === 'mist') {
      pos[i3] += Math.sin(pos[i3 + 1] + audio.mid) * 0.15 * dt;
      pos[i3 + 1] += speed * dt * (preset === 'mist' ? 0.4 : 0.8);
    } else if (preset === 'bubbles') {
      pos[i3 + 1] += speed * dt * 1.2;
      pos[i3] += Math.sin(pos[i3 + 1] * 2) * 0.2 * dt;
    } else if (preset === 'sparks' || preset === 'embers') {
      pos[i3] += vx * dt * (2 + audio.bass * 4);
      pos[i3 + 1] += vy * dt * (2 + audio.bass * 4);
      pos[i3 + 2] += vz * dt;
    } else {
      pos[i3 + 1] += speed * dt;
    }
  }

  private resetParticle(index: number, positions: Float32Array, radius: number): void {
    const i3 = index * 3;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    positions[i3] = Math.cos(a) * r;
    positions[i3 + 1] = (Math.random() - 0.5) * radius;
    positions[i3 + 2] = -Math.random() * radius - 4.0;
    this.velocities[i3] = (Math.random() - 0.5) * 1.5;
    this.velocities[i3 + 1] = (Math.random() - 0.5) * 1.5;
    this.velocities[i3 + 2] = Math.random() * 0.4;
  }
}

function outOfBounds(pos: Float32Array, i3: number, preset: WorldConfig['particles']['preset']): boolean {
  const x = pos[i3]!;
  const y = pos[i3 + 1]!;
  const z = pos[i3 + 2]!;
  if (preset === 'stars' || preset === 'stardust') {
    return z > 2.2;
  }
  return Math.abs(x) > 9 || Math.abs(y) > 7 || Math.abs(z) > 9;
}

function spawnRadius(world: WorldConfig): number {
  return world.particles.preset === 'stars' ? 10 : 6;
}
