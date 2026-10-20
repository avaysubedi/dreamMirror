import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { VISUAL_CONFIG } from '../config/visual.config';
import { AudioFrame } from '../models/audio-frame';
import { WorldConfig } from '../models/world-config';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';
import { BLIT_FRAG } from '../../visual/shaders/blit.frag';
import { COMPOSITE_FRAG } from '../../visual/shaders/composite.frag';
import { FULLSCREEN_VERT } from '../../visual/shaders/fullscreen.vert';
import { EffectEngineService } from './effect-engine.service';
import { ParticleSystemService } from './particle-system.service';
import { TransitionManagerService } from './transition-manager.service';

@Injectable({ providedIn: 'root' })
export class VisualEngineService {
  private readonly effects = inject(EffectEngineService);
  private readonly particles = inject(ParticleSystemService);
  private readonly transitions = inject(TransitionManagerService);

  private renderer: THREE.WebGLRenderer | null = null;
  private composeScene: THREE.Scene | null = null;
  private particleScene: THREE.Scene | null = null;
  private blitScene: THREE.Scene | null = null;
  private camera2d: THREE.OrthographicCamera | null = null;
  private camera3d: THREE.PerspectiveCamera | null = null;
  private composeMaterial: THREE.ShaderMaterial | null = null;
  private blitMaterial: THREE.ShaderMaterial | null = null;
  private rtA: THREE.WebGLRenderTarget | null = null;
  private rtB: THREE.WebGLRenderTarget | null = null;
  private videoTexture: THREE.VideoTexture | null = null;
  private dummyTexture: THREE.DataTexture | null = null;
  private raf = 0;
  private last = 0;
  private running = false;
  private video: HTMLVideoElement | null = null;
  private world: WorldConfig | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private canvas: HTMLCanvasElement | null = null;

  initialize(canvas: HTMLCanvasElement, video: HTMLVideoElement): void {
    this.dispose();
    this.canvas = canvas;
    this.video = video;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, VISUAL_CONFIG.maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    this.renderer = renderer;

    this.camera2d = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera3d = new THREE.PerspectiveCamera(60, 1, 0.1, 40);
    this.camera3d.position.z = 6;

    const dummy = new THREE.DataTexture(new Uint8Array([8, 6, 16, 255]), 1, 1);
    dummy.needsUpdate = true;
    this.dummyTexture = dummy;

    this.composeMaterial = new THREE.ShaderMaterial({
      uniforms: this.createUniforms(dummy),
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
    });
    this.composeScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composeMaterial);
    quad.frustumCulled = false;
    this.composeScene.add(quad);

    this.particleScene = new THREE.Scene();
    this.particleScene.add(this.particles.create());
    this.setWorld(WORLD_REGISTRY[0]!);

    this.blitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: dummy },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uBloom: { value: 0.3 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLIT_FRAG,
      depthTest: false,
    });
    this.blitScene = new THREE.Scene();
    const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMaterial);
    blitQuad.frustumCulled = false;
    this.blitScene.add(blitQuad);

    this.setVideo(video);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
  }

  setVideo(video: HTMLVideoElement): void {
    this.video = video;
    this.videoTexture?.dispose();
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.videoTexture = texture;
    if (this.composeMaterial) {
      this.composeMaterial.uniforms['uVideo']!.value = texture;
    }
  }

  setWorld(world: WorldConfig): void {
    this.world = world;
    this.particles.configure(world);
  }

  start(): void {
    this.running = true;
    this.last = performance.now();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderFrame(audio: AudioFrame, now = performance.now()): void {
    if (!this.renderer || !this.composeMaterial || !this.world || !this.rtA || !this.rtB) {
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.transitions.tick(now);
    const state = this.effects.compute(this.world, audio);
    this.writeUniforms(this.world, audio, state, now);
    this.particles.update(dt, this.world, audio, state.particleSpeed, state.particleSize);

    const renderer = this.renderer;
    renderer.setRenderTarget(this.rtA);
    renderer.clear();
    renderer.render(this.composeScene!, this.camera2d!);
    renderer.render(this.particleScene!, this.camera3d!);
    renderer.setRenderTarget(null);
    this.blitMaterial!.uniforms['uScene']!.value = this.rtA.texture;
    this.blitMaterial!.uniforms['uBloom']!.value = state.strengths.bloom;
    renderer.clear();
    renderer.render(this.blitScene!, this.camera2d!);

    const swap = this.rtA;
    this.rtA = this.rtB;
    this.rtB = swap;
    this.composeMaterial.uniforms['uFeedback']!.value = this.rtB.texture;
  }

  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.particles.dispose();
    this.videoTexture?.dispose();
    this.dummyTexture?.dispose();
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.composeMaterial?.dispose();
    this.blitMaterial?.dispose();
    this.renderer?.dispose();
    this.renderer = null;
    this.composeScene = null;
    this.particleScene = null;
    this.blitScene = null;
    this.videoTexture = null;
  }

  private createUniforms(dummy: THREE.Texture): Record<string, THREE.IUniform> {
    return {
      uVideo: { value: dummy },
      uFeedback: { value: dummy },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uHasVideo: { value: 0 },
      uVideoAspect: { value: 16 / 9 },
      uCameraMix: { value: 0.45 },
      uHueShift: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uVolume: { value: 0 },
      uRms: { value: 0 },
      uEnergy: { value: 0 },
      uBeat: { value: 0 },
      uDrop: { value: 0 },
      uPrimary: { value: new THREE.Vector3() },
      uSecondary: { value: new THREE.Vector3() },
      uAccent: { value: new THREE.Vector3() },
      uFog: { value: new THREE.Vector3() },
      uWorldIndex: { value: 1 },
      uTransitionIndex: { value: 0 },
      uTransitionProgress: { value: 0 },
      uKaleido: { value: 0 },
      uRgbSplit: { value: 0 },
      uBloom: { value: 0 },
      uGlow: { value: 0 },
      uVhs: { value: 0 },
      uChromatic: { value: 0 },
      uMirror: { value: 0 },
      uFeedbackAmt: { value: 0 },
      uTunnel: { value: 0 },
      uDreamBlur: { value: 0 },
      uFractalZoom: { value: 0 },
      uRipple: { value: 0 },
      uColorMelt: { value: 0 },
      uLensWarp: { value: 0 },
      uTrails: { value: 0 },
      uPixelSort: { value: 0 },
      uShockwave: { value: 0 },
    };
  }

  private writeUniforms(
    world: WorldConfig,
    audio: AudioFrame,
    state: ReturnType<EffectEngineService['compute']>,
    now: number,
  ): void {
    const u = this.composeMaterial!.uniforms;
    const s = state.strengths;
    u['uTime']!.value = now * 0.001;
    u['uHasVideo']!.value = this.video && this.video.readyState >= 2 ? 1 : 0;
    u['uVideoAspect']!.value = this.video && this.video.videoWidth ? this.video.videoWidth / this.video.videoHeight : 16 / 9;
    u['uCameraMix']!.value = state.cameraMix;
    u['uHueShift']!.value = state.hueShift;
    u['uBass']!.value = audio.bass;
    u['uMid']!.value = audio.mid;
    u['uTreble']!.value = audio.treble;
    u['uVolume']!.value = audio.volume;
    u['uRms']!.value = audio.rms;
    u['uEnergy']!.value = audio.energy;
    u['uBeat']!.value = audio.beat;
    u['uDrop']!.value = audio.drop;
    setVec3(u['uPrimary']!.value, world.palette.primary);
    setVec3(u['uSecondary']!.value, world.palette.secondary);
    setVec3(u['uAccent']!.value, world.palette.accent);
    setVec3(u['uFog']!.value, world.palette.fog);
    u['uWorldIndex']!.value = world.index;
    u['uTransitionIndex']!.value = this.transitions.index();
    u['uTransitionProgress']!.value = this.transitions.progress();
    u['uKaleido']!.value = s.kaleidoscope;
    u['uRgbSplit']!.value = s.rgbSplit;
    u['uBloom']!.value = s.bloom;
    u['uGlow']!.value = s.glow;
    u['uVhs']!.value = s.vhs;
    u['uChromatic']!.value = s.chromaticAberration;
    u['uMirror']!.value = s.infiniteMirror;
    u['uFeedbackAmt']!.value = s.feedbackLoop;
    u['uTunnel']!.value = s.tunnelWarp;
    u['uDreamBlur']!.value = s.dreamBlur;
    u['uFractalZoom']!.value = s.fractalZoom;
    u['uRipple']!.value = s.rippleDistortion;
    u['uColorMelt']!.value = s.colorMelt;
    u['uLensWarp']!.value = s.lensWarp;
    u['uTrails']!.value = s.motionTrails;
    u['uPixelSort']!.value = s.pixelSort;
    u['uShockwave']!.value = s.shockwaves;
  }

  private resize(): void {
    if (!this.renderer || !this.canvas) {
      return;
    }
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = Math.max(1, parent.clientWidth || window.innerWidth);
    const height = Math.max(1, parent.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.rtA = this.makeTarget(width, height);
    this.rtB = this.makeTarget(width, height);
    if (this.camera3d) {
      this.camera3d.aspect = width / height;
      this.camera3d.updateProjectionMatrix();
    }
    this.composeMaterial?.uniforms['uResolution']!.value.set(width, height);
    this.blitMaterial?.uniforms['uResolution']!.value.set(width, height);
    if (this.composeMaterial && this.rtB) {
      this.composeMaterial.uniforms['uFeedback']!.value = this.rtB.texture;
    }
  }

  private makeTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const pixelRatio = this.renderer?.getPixelRatio() ?? 1;
    return new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  }
}

function setVec3(target: THREE.Vector3, rgb: [number, number, number]): void {
  target.set(rgb[0], rgb[1], rgb[2]);
}
