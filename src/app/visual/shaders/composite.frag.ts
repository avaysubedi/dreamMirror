export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uVideo;
uniform sampler2D uFeedback;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHasVideo;
uniform float uVideoAspect;
uniform float uCameraMix;
uniform float uHueShift;

uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uVolume;
uniform float uRms;
uniform float uEnergy;
uniform float uBeat;
uniform float uDrop;

uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
uniform vec3 uFog;

uniform float uWorldIndex;
uniform float uTransitionIndex;
uniform float uTransitionProgress;

uniform float uKaleido;
uniform float uRgbSplit;
uniform float uBloom;
uniform float uGlow;
uniform float uVhs;
uniform float uChromatic;
uniform float uMirror;
uniform float uFeedbackAmt;
uniform float uTunnel;
uniform float uDreamBlur;
uniform float uFractalZoom;
uniform float uRipple;
uniform float uColorMelt;
uniform float uLensWarp;
uniform float uTrails;
uniform float uPixelSort;
uniform float uShockwave;
uniform float uTransform;
uniform float uEventType;
uniform float uEventIntensity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 hueRotate(vec3 color, float turns) {
  float angle = turns * 6.2831853;
  float s = sin(angle);
  float c = cos(angle);
  mat3 m = mat3(
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114
  ) + mat3(
    0.701, -0.587, -0.114,
    -0.299, 0.413, -0.114,
    -0.3, -0.588, 0.886
  ) * c + mat3(
    0.168, 0.330, -0.497,
    -0.328, 0.035, 0.292,
    1.25, -1.05, -0.203
  ) * s;
  return clamp(m * color, 0.0, 1.0);
}

vec2 coverUv(vec2 uv) {
  float screenAspect = uResolution.x / max(uResolution.y, 1.0);
  float aspect = max(uVideoAspect, 0.01);
  vec2 scaled = uv;
  if (screenAspect > aspect) {
    float s = aspect / screenAspect;
    scaled.y = (uv.y - 0.5) * s + 0.5;
  } else {
    float s = screenAspect / aspect;
    scaled.x = (uv.x - 0.5) * s + 0.5;
  }
  return scaled;
}

vec3 sampleVideo(vec2 uv) {
  vec2 cuv = coverUv(uv);
  vec3 col = texture2D(uVideo, clamp(cuv, 0.0, 1.0)).rgb;
  if (uHasVideo < 0.5) {
    float n = fbm(uv * 3.5 + uTime * 0.04);
    vec2 p = uv - 0.5;
    float silhouette = smoothstep(0.26, 0.06, length(p * vec2(0.85, 1.15)));
    vec3 bg = uFog * 0.35 + uSecondary * 0.08 * n;
    vec3 figure = mix(uPrimary * 0.45, uAccent * 0.65, n) * (0.8 + 0.3 * uBass);
    col = mix(bg, figure, silhouette * 0.7);
  }
  return col;
}

vec2 kaleido(vec2 uv, float amount) {
  if (amount < 0.01) return uv;
  vec2 p = uv - 0.5;
  float segments = mix(4.0, 12.0, amount);
  float a = atan(p.y, p.x);
  float r = length(p);
  a = mod(a, 6.2831853 / segments);
  a = abs(a - 3.14159265 / segments);
  return vec2(cos(a), sin(a)) * r + 0.5;
}

vec2 tunnel(vec2 uv, float amount) {
  if (amount < 0.01) return uv;
  vec2 p = uv - 0.5;
  float r = length(p);
  float a = atan(p.y, p.x);
  float z = mix(1.0, 0.35 + 0.65 / (r + 0.12), amount);
  float warp = uTime * (0.08 + uBass * 0.12);
  vec2 polar = vec2(a / 6.2831853 + 0.5, fract(z + warp));
  return mix(uv, polar, amount);
}

vec2 ripple(vec2 uv, float amount) {
  vec2 p = uv - 0.5;
  float d = length(p);
  float wave = sin(d * mix(8.0, 28.0, amount) - uTime * 3.0 - uBass * 6.0);
  return uv + p / max(d, 0.001) * wave * amount * 0.045;
}

vec2 lens(vec2 uv, float amount) {
  vec2 p = uv - 0.5;
  return 0.5 + p * (1.0 + amount * 0.35 * length(p));
}

vec2 shock(vec2 uv) {
  vec2 p = uv - 0.5;
  float d = length(p);
  float ring = sin((d - uTime * (0.8 + uBeat) - uDrop) * 28.0);
  float amp = uShockwave * exp(-d * 3.2) * (0.35 + uBass);
  return uv + normalize(p + 0.0001) * ring * amp * 0.05;
}

float eyeSdf(vec2 p) {
  float lid = length(p / vec2(0.38, 0.16)) - 1.0;
  float iris = length(p) - 0.11;
  float pupil = length(p * vec2(1.0, 1.15)) - 0.045;
  float white = smoothstep(0.05, -0.02, lid);
  float irisMask = smoothstep(0.03, -0.01, iris);
  float pupilMask = smoothstep(0.02, 0.0, pupil);
  return white * 0.65 + irisMask * 0.9 + pupilMask;
}

float filledCircle(vec2 p, vec2 center, float radius) {
  return 1.0 - smoothstep(radius - 0.012, radius + 0.012, length(p - center));
}

float eventShape(vec2 p, float kind) {
  float shape = 0.0;
  vec2 q = p;
  if (kind < 1.5) { // Giant banana
    q.x *= 1.15;
    float curve = 0.55 * q.x * q.x - 0.1;
    shape = (1.0 - smoothstep(0.025, 0.055, abs(q.y - curve))) * smoothstep(0.43, 0.32, abs(q.x));
    shape = max(shape, 1.0 - smoothstep(0.01, 0.035, abs(q.y - curve - 0.04)) * smoothstep(0.4, 0.3, abs(q.x)));
  } else if (kind < 2.5 || kind > 5.5 && kind < 6.5) { // UFO or mothership
    float scale = kind < 2.5 ? 1.0 : 1.65;
    q *= scale;
    float disc = filledCircle(q, vec2(0.0, 0.03), 0.29) * smoothstep(0.0, 0.1, q.y + 0.13);
    float dome = filledCircle(q, vec2(0.0, 0.09), 0.14);
    float beam = (1.0 - smoothstep(0.0, 0.025, abs(q.x) - (0.25 - abs(q.y) * 0.4))) * smoothstep(-0.02, -0.12, q.y) * smoothstep(-0.48, -0.24, q.y);
    shape = max(max(disc, dome), beam * 0.65);
  } else if (kind < 3.5) { // Giant cat face
    float face = filledCircle(q, vec2(0.0, -0.02), 0.27);
    float earL = (1.0 - smoothstep(0.02, 0.045, abs(q.x + 0.19) + abs(q.y - 0.2) * 0.62)) * step(q.y, 0.34) * step(0.1, q.y);
    float earR = (1.0 - smoothstep(0.02, 0.045, abs(q.x - 0.19) + abs(q.y - 0.2) * 0.62)) * step(q.y, 0.34) * step(0.1, q.y);
    float eyes = filledCircle(q, vec2(-0.1, 0.0), 0.025) + filledCircle(q, vec2(0.1, 0.0), 0.025);
    float laser = (1.0 - smoothstep(0.004, 0.014, abs(q.y) - 0.006)) * step(0.11, abs(q.x)) * (1.0 - smoothstep(0.12, 0.48, abs(q.x)));
    shape = max(max(face, max(earL, earR)), max(eyes, laser * uEventIntensity));
  } else if (kind < 4.5) { // Giant duck
    shape = max(filledCircle(q, vec2(-0.07, -0.08), 0.25), filledCircle(q, vec2(0.13, 0.13), 0.16));
    float bill = (1.0 - smoothstep(0.0, 0.025, abs(q.y - 0.09))) * step(0.19, q.x) * (1.0 - smoothstep(0.19, 0.35, q.x));
    shape = max(shape, bill);
  } else if (kind < 5.5) { // Portal
    float radius = length(q);
    float ring = 1.0 - smoothstep(0.018, 0.045, abs(radius - 0.31));
    float spiral = 1.0 - smoothstep(0.012, 0.035, abs(radius - (0.07 + 0.22 * fract(atan(q.y, q.x) * 0.45 + uTime * 0.12))));
    shape = max(ring, spiral * 0.7);
  } else if (kind < 7.5) { // Laser sweeps
    float ray = 1.0 - smoothstep(0.003, 0.02, abs(q.y - 0.12 * sin(q.x * 9.0 + uTime * 2.0)));
    shape = ray * smoothstep(0.52, 0.1, abs(q.x));
  } else if (kind < 8.5) { // Glitch anomaly
    float band = step(0.35, fract((q.y + uTime * 0.22) * 13.0));
    shape = band * smoothstep(0.55, 0.05, abs(q.x + 0.06 * sin(q.y * 40.0 + uTime)));
  } else if (kind < 9.5) { // Pizza slice / planet
    float a = atan(q.y, q.x);
    float wedge = (1.0 - smoothstep(0.48, 0.53, abs(a))) * (1.0 - smoothstep(0.3, 0.34, length(q))) * smoothstep(0.02, 0.08, length(q));
    shape = wedge;
    shape = max(shape, filledCircle(q, vec2(-0.08, 0.08), 0.035) * wedge);
    shape = max(shape, filledCircle(q, vec2(0.08, 0.12), 0.03) * wedge);
    shape = max(shape, filledCircle(q, vec2(0.02, -0.02), 0.028) * wedge);
  } else { // Rain / asset storm
    vec2 drops = fract((q + vec2(0.0, uTime * 0.42)) * vec2(8.0, 5.0)) - 0.5;
    shape = (1.0 - smoothstep(0.018, 0.045, abs(drops.x))) * (1.0 - smoothstep(0.12, 0.22, abs(drops.y)));
  }
  return clamp(shape, 0.0, 1.0);
}

vec3 worldOverlay(vec2 uv, vec3 cam, float idx) {
  vec2 p = uv - 0.5;
  float t = uTime;
  vec3 col = cam;

  if (idx < 1.5) {
    // 1. Cosmic Birth
    float neb = fbm(uv * 3.2 + vec2(t * 0.03, t * 0.02));
    float stars = pow(hash(floor(uv * uResolution.xy * 0.25)), 22.0);
    col = mix(uFog * 0.4, cam, 0.55 + 0.2 * uBass);
    col += uPrimary * neb * 0.45;
    col += uSecondary * pow(neb, 2.5) * 0.45;
    col += vec3(stars) * (0.5 + uTreble * 0.5);
  } else if (idx < 2.5) {
    // 2. Cyber Dimension: scrolling circuitry, scan lanes, and data pulses.
    vec2 gridUv = uv * vec2(26.0, 15.0);
    vec2 cell = abs(fract(gridUv - vec2(0.0, t * 0.7)) - 0.5);
    float grid = 1.0 - smoothstep(0.015, 0.055, min(cell.x, cell.y));
    float data = step(0.82, hash(floor(gridUv) + floor(t * 1.5))) * smoothstep(0.42, 0.0, cell.x);
    float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 0.12 - t * 7.0);
    col = mix(cam, cam * 0.62 + uFog * 0.2, 0.12);
    col += uPrimary * grid * 0.18 + uAccent * data * (0.16 + 0.18 * scan);
    col += uSecondary * pow(max(0.0, 1.0 - abs(p.x + 0.2 * sin(t * 0.3))), 4.0) * 0.04;
  } else if (idx < 3.5) {
    // 3. Fractal Temple
    float a = atan(p.y, p.x);
    float r = length(p);
    float mandala = sin(a * 8.0 + t * 0.4) * sin(r * 18.0 - t);
    float rings = smoothstep(0.04, 0.0, abs(fract(r * 6.0 - t * 0.1) - 0.5));
    col = mix(cam, uPrimary, 0.25 + 0.15 * abs(mandala));
    col += uAccent * rings * 0.35;
    col = mix(col, uSecondary, smoothstep(0.7, 0.15, r) * 0.2);
  } else if (idx < 4.5) {
    // 4. Psychedelic Jungle: layered leaves and animated curling vines.
    float leafWave = sin(uv.x * 21.0 + sin(uv.y * 8.0 + t * 0.45) * 1.7 + t * 0.3);
    float leafVein = 1.0 - smoothstep(0.02, 0.07, abs(fract(uv.y * 6.0 + leafWave * 0.06) - 0.5));
    float vine = 1.0 - smoothstep(0.008, 0.025, abs(p.x - 0.2 * sin(p.y * 8.0 + t * 0.7)));
    float glowFlora = fbm(uv * 5.0 + vec2(t * 0.03, -t * 0.08));
    col = mix(cam, hueRotate(cam, 0.08 + glowFlora * 0.08), 0.16);
    col += uPrimary * leafVein * 0.09 + uSecondary * vine * 0.16;
    col += uAccent * pow(glowFlora, 3.0) * 0.16;
  } else if (idx < 5.5) {
    // 5. Interdimensional Eyes
    float eyes = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float ang = fi * 0.785398 + t * 0.08;
      vec2 ep = vec2(cos(ang), sin(ang)) * (0.22 + 0.08 * sin(t + fi));
      eyes += eyeSdf((p - ep) * 2.4);
    }
    eyes += eyeSdf(p * mix(1.6, 1.1, uBass));
    col = mix(cam, uFog * 0.3, 0.2);
    col = mix(col, uPrimary, clamp(eyes, 0.0, 1.0) * 0.45);
    col += uAccent * smoothstep(0.4, 1.2, eyes) * 0.25;
  } else if (idx < 6.5) {
    // 6. Meme World: a playful mix that rotates motifs instead of repeating a single effect.
    float mode = mod(floor(t * 0.18), 4.0);
    float pop = max(0.0, sin(uv.y * 16.0 + t * 1.8)) * 0.5 + 0.5;
    float memeShape = mode < 1.0 ? eyeSdf(p * 1.8) : mode < 2.0 ? (1.0 - smoothstep(0.01, 0.05, abs(length(p) - 0.28))) : mode < 3.0 ? step(0.78, hash(floor(uv * 18.0 + t))) : pow(max(0.0, sin((p.x + p.y) * 18.0 + t)), 8.0);
    col = mix(cam, hueRotate(cam, pop * 0.08), 0.12);
    col += mix(uPrimary, uSecondary, pop) * memeShape * 0.19 + uAccent * memeShape * 0.12;
  } else if (idx < 7.5) {
    // 7. Energy Ascension
    float bolt = 0.0;
    for (int i = 0; i < 4; i++) {
      float s = float(i) * 19.1;
      float x = 0.08 * sin(uv.y * (18.0 + s) + t * 8.0 + s);
      bolt += smoothstep(0.018, 0.0, abs(p.x - x - 0.12 * sin(s)));
    }
    float aura = exp(-length(p) * (2.8 - uBass * 1.2));
    col = mix(cam, uPrimary, 0.15);
    col += uAccent * bolt * (0.35 + uBeat * 0.5);
    col += uSecondary * aura * 0.35;
  } else if (idx < 8.5) {
    // 8. Angel Ascension (Refined ethereal glow without overexposure)
    float radial = 1.0 - abs(atan(p.y, p.x)) / 3.14159;
    float rays = pow(max(0.0, radial), 10.0) * (0.3 + 0.4 * noise(vec2(atan(p.y, p.x) * 8.0, t)));
    float halo = smoothstep(0.04, 0.0, abs(length(p) - 0.28 - uBass * 0.03));
    float wing = exp(-abs(p.y) * 2.8) * smoothstep(0.55, 0.1, abs(p.x));
    col = mix(uFog * 0.5, cam, 0.45);
    col += uAccent * (rays * 0.35 + halo * 0.45);
    col += uSecondary * wing * 0.25;
  } else if (idx < 9.5) {
    // 9. Galactic Flight
    float r = length(p);
    float streaks = pow(hash(vec2(atan(p.y, p.x), floor((r - t * (0.4 + uEnergy)) * 36.0))), 12.0);
    col = mix(uFog * 0.4, cam, 0.5);
    col += uPrimary * streaks * 1.0;
    col += uAccent * exp(-r * 2.2) * 0.25;
  } else if (idx < 10.5) {
    // 10. Buddha Peace
    float a = atan(p.y, p.x);
    float r = length(p);
    float lotus = 0.5 + 0.5 * sin(a * 8.0 + sin(r * 12.0 - t * 0.3));
    float glowCenter = exp(-r * 3.5);
    col = mix(cam, uPrimary, 0.2 * lotus);
    col += uAccent * glowCenter * 0.35;
    col = mix(col, uSecondary, 0.12 * (1.0 - lotus));
  } else if (idx > 11.5) {
    // Playful worlds use one bold, slowly moving silhouette rather than a screen of particles.
    float kind = idx - 12.0;
    vec2 q = p;
    float motif = 0.0;
    if (kind < 0.5) { // Flying bananas curve down into a moving vortex.
      q.x = mod(p.x + 0.5 + 0.12 * sin(uTime * 0.5 + p.y * 5.0), 0.62) - 0.31;
      q.y = mod(p.y + uTime * 0.12, 0.82) - 0.41;
      float peel = 0.24 * (q.x * q.x - 0.06) - 0.12;
      motif = smoothstep(0.055, 0.015, abs(q.y - peel) - abs(q.x) * 0.2);
      motif *= smoothstep(0.34, 0.22, abs(q.x));
    } else if (kind < 1.5) { // UFO saucer and downward beam
      q.x = mod(p.x + 0.5 + 0.12 * sin(uTime * 0.35 + p.y * 4.0), 0.72) - 0.36;
      q.y = mod(p.y + 0.5 + 0.05 * sin(uTime + q.x * 7.0), 0.8) - 0.4;
      float saucer = filledCircle(q * vec2(1.0, 2.4), vec2(0.0), 0.11);
      float dome = filledCircle(q * vec2(1.0, 2.0), vec2(0.0, 0.09), 0.055);
      float beam = (1.0 - smoothstep(0.025, 0.05, abs(q.x) - (0.13 - abs(q.y) * 0.25))) * smoothstep(-0.04, -0.15, q.y);
      motif = max(max(saucer, dome), beam * 0.45);
    } else if (kind < 2.5) { // Floating cat faces with bright eyes.
      q = mod(p + 0.5, 0.78) - 0.39;
      float face = filledCircle(q, vec2(0.0, -0.015), 0.12);
      float earL = (1.0 - smoothstep(0.015, 0.035, abs(q.x + 0.075) + abs(q.y - 0.1) * 0.55)) * step(0.02, q.y);
      float earR = (1.0 - smoothstep(0.015, 0.035, abs(q.x - 0.075) + abs(q.y - 0.1) * 0.55)) * step(0.02, q.y);
      float eyes = filledCircle(q, vec2(-0.045, -0.005), 0.012) + filledCircle(q, vec2(0.045, -0.005), 0.012);
      motif = max(max(face, max(earL, earR)), eyes * 1.8);
    } else if (kind < 3.5) { // Ducks bob through the scene in loose flocks.
      q = mod(p + 0.5, 0.7) - 0.35;
      float body = filledCircle(q, vec2(-0.015, -0.05), 0.13);
      float head = filledCircle(q, vec2(0.095, 0.065 + 0.025 * sin(uTime * 1.5 + q.x * 12.0)), 0.075);
      float bill = (1.0 - smoothstep(0.016, 0.04, abs(q.y - 0.055))) * step(0.16, q.x) * (1.0 - smoothstep(0.16, 0.25, q.x));
      motif = max(max(body, head), bill);
    } else if (kind < 4.5) { // Pizza planets, orbiting slices, and bubbling toppings.
      q = p;
      float radius = length(q);
      float planet = 1.0 - smoothstep(0.01, 0.035, abs(radius - 0.28));
      float a = atan(q.y, q.x) + uTime * 0.16;
      float slice = (1.0 - smoothstep(0.42, 0.5, abs(a))) * (1.0 - smoothstep(0.18, 0.21, radius)) * smoothstep(0.035, 0.07, radius);
      float orbit = 1.0 - smoothstep(0.01, 0.026, abs(q.y - 0.1 * sin(q.x * 3.0 + uTime)));
      motif = max(max(planet * 0.65, slice * 0.9), orbit * 0.35);
    } else {
      float memeMode = 1.0 + mod(floor(t * 0.25), 9.0);
      motif = eventShape(p * 2.0, memeMode) * 0.52;
    }
    col = mix(cam, uFog * 0.35 + uPrimary * 0.18, 0.16);
    col += uPrimary * motif * 0.85;
    col += uSecondary * smoothstep(0.7, 0.1, length(p)) * 0.08;
  } else {
    // 11. Return to Reality
    float fade = 0.15 * (1.0 - smoothstep(0.0, 1.0, uEnergy));
    col = mix(cam, mix(cam, uFog * 0.4, fade), 0.15);
    col += uAccent * 0.03 * fbm(uv * 2.0);
  }

  return col;
}

vec3 applyTransition(vec2 uv, vec3 color, float idx, float prog) {
  if (prog < 0.001) return color;
  vec2 p = uv - 0.5;
  float d = length(p);
  float flash = 0.0;
  vec3 tint = uAccent;

  if (idx < 0.5) {
    flash = pow(sin(prog * 3.14159), 1.6) * 0.7;
    tint = vec3(0.95, 0.95, 1.0);
  } else if (idx < 1.5) {
    flash = fbm(uv * 10.0 + prog * 4.0) * sin(prog * 3.14159) * 0.65;
    tint = mix(uPrimary, uAccent, prog);
  } else if (idx < 2.5) {
    flash = sin(prog * 3.14159) * 0.5;
    color = hueRotate(color, prog);
  } else if (idx < 3.5) {
    float portal = smoothstep(prog * 0.8, prog * 0.8 - 0.12, d);
    flash = portal * sin(prog * 3.14159) * 0.7;
    tint = mix(uSecondary, uAccent, prog);
  } else if (idx < 4.5) {
    flash = (1.0 - smoothstep(0.0, 1.0, d + prog)) * sin(prog * 3.14159) * 0.6;
  } else if (idx < 5.5) {
    float tear = smoothstep(0.01, 0.0, abs(p.x + 0.2 * sin(p.y * 18.0) - (prog - 0.5)));
    flash = (tear + 0.2 * sin(prog * 3.14159)) * 0.6;
  } else if (idx < 6.5) {
    flash = pow(sin(prog * 3.14159), 0.8) * 0.65;
    tint = mix(uPrimary, vec3(0.9), prog);
  } else {
    vec2 zuv = 0.5 + (uv - 0.5) * mix(1.0, 0.2, sin(prog * 3.14159));
    color = mix(color, sampleVideo(zuv), 0.35 * sin(prog * 3.14159));
    flash = 0.2 * sin(prog * 3.14159);
  }

  return mix(color, mix(color, tint, 0.5), clamp(flash, 0.0, 0.75));
}

void main() {
  vec2 uv = vUv;
  uv = shock(uv);
  uv = kaleido(uv, uKaleido);
  uv = tunnel(uv, uTunnel);
  uv = ripple(uv, uRipple);
  uv = lens(uv, uLensWarp);

  float zoom = 1.0 - uFractalZoom * 0.18 * (0.5 + 0.5 * sin(uTime + uBass * 8.0));
  uv = 0.5 + (uv - 0.5) * zoom;

  vec2 chroma = (uv - 0.5) * (uChromatic + uRgbSplit) * 0.015;
  vec3 cam;
  cam.r = sampleVideo(uv + chroma).r;
  cam.g = sampleVideo(uv).g;
  cam.b = sampleVideo(uv - chroma).b;

  // Anime world: restrained cel shading and ink contours keep the live camera readable.
  if (uWorldIndex > 17.5 && uWorldIndex < 18.5) {
    vec2 texel = 1.5 / uResolution;
    vec3 right = sampleVideo(uv + vec2(texel.x, 0.0));
    vec3 up = sampleVideo(uv + vec2(0.0, texel.y));
    float edge = length(cam - right) + length(cam - up);
    float lum = dot(cam, vec3(0.299, 0.587, 0.114));
    float cel = floor(lum * 5.0 + 0.5) / 5.0;
    cam = mix(cam, cam * (0.48 + cel * 0.72), 0.72);
    cam *= 1.0 - smoothstep(0.07, 0.22, edge) * 0.62;
    cam += uAccent * smoothstep(0.25, 0.55, lum) * 0.08;
  }

  if (uPixelSort > 0.01) {
    float lum = dot(cam, vec3(0.299, 0.587, 0.114));
    vec2 suv = uv + vec2(0.0, (lum - 0.5) * uPixelSort * 0.12);
    cam = mix(cam, sampleVideo(suv), uPixelSort);
  }

  vec3 world = worldOverlay(vUv, cam, uWorldIndex);
  float camMix = clamp(uCameraMix, 0.72, 1.0);
  vec3 color = mix(world, cam, 0.68 + camMix * 0.32);

  if (uColorMelt > 0.01) {
    color = hueRotate(color, uColorMelt * 0.25 + uHueShift + uMid * 0.08);
  } else {
    color = hueRotate(color, uHueShift);
  }

  // Sample feedback with active 18% decay to prevent runaway light saturation
  vec3 fb = texture2D(uFeedback, vUv * mix(1.0, 0.98, uMirror) + 0.01 * uMirror).rgb;
  fb = clamp(fb * 0.82, 0.0, 1.0);
  float fbWeight = clamp(uFeedbackAmt * 0.35 + uTrails * 0.3 + uMirror * 0.2, 0.0, 0.45);
  color = mix(color, fb, fbWeight);

  if (uDreamBlur > 0.01) {
    vec3 blur = sampleVideo(uv + vec2(0.003, 0.0) * uDreamBlur)
      + sampleVideo(uv - vec2(0.003, 0.0) * uDreamBlur)
      + sampleVideo(uv + vec2(0.0, 0.003) * uDreamBlur)
      + sampleVideo(uv - vec2(0.0, 0.003) * uDreamBlur);
    color = mix(color, blur * 0.25, uDreamBlur * 0.35);
  }

  if (uVhs > 0.01) {
    float scan = sin(vUv.y * uResolution.y * 1.5 + uTime * 8.0) * 0.04;
    float n = hash(vUv * uTime) * 0.08;
    color += vec3(scan + n) * uVhs;
    color.gb *= 1.0 - uVhs * 0.08;
  }

  // Light touch camera transformations keep facial features and clothing readable.
  float sourceLuma = dot(cam, vec3(0.299, 0.587, 0.114));
  float edgeX = abs(sourceLuma - dot(sampleVideo(uv + vec2(0.003, 0.0)), vec3(0.299, 0.587, 0.114)));
  float edgeY = abs(sourceLuma - dot(sampleVideo(uv + vec2(0.0, 0.003)), vec3(0.299, 0.587, 0.114)));
  float bodyEdge = clamp((edgeX + edgeY) * 7.0, 0.0, 1.0);
  if (uTransform > 0.5 && uTransform < 1.5) {
    float stars = pow(hash(floor(uv * uResolution * 0.12 + uTime * 0.1)), 28.0);
    color = mix(color, hueRotate(color, 0.12), 0.28) + uAccent * stars * 0.45;
  } else if (uTransform < 2.5 && uTransform > 1.5) {
    float scan = 0.92 + 0.08 * sin(uv.y * uResolution.y * 0.32);
    color = mix(color, vec3(color.g * 0.55, color.g, color.g * 1.25), 0.22) * scan;
    color += uSecondary * bodyEdge * 0.18;
  } else if (uTransform < 3.5 && uTransform > 2.5) {
    vec3 facets = floor(color * 7.0 + noise(uv * 180.0) * 0.35) / 7.0;
    color = mix(color, facets, 0.22) + uAccent * bodyEdge * 0.12;
  } else if (uTransform < 4.5 && uTransform > 3.5) {
    float metal = 0.5 + 0.5 * sin(sourceLuma * 9.0 + bodyEdge * 3.0 + uTime * 0.35);
    color = mix(color, vec3(metal) * uAccent + color * 0.55, 0.18);
  } else if (uTransform < 5.5 && uTransform > 4.5) {
    color += uAccent * bodyEdge * (0.22 + uBass * 0.12);
  } else if (uTransform < 6.5 && uTransform > 5.5) {
    float smoke = fbm(uv * 5.0 + vec2(uTime * 0.025, -uTime * 0.04));
    color = mix(color, color * (0.72 + smoke * 0.45) + uSecondary * smoke * 0.08, 0.2);
  } else if (uTransform > 6.5) {
    color += uPrimary * bodyEdge * 0.34;
    color = mix(color, hueRotate(color, 0.52), 0.12);
  }

  // Sparse world events: a single oversized, themed shader asset with a soft glow.
  if (uEventType > 0.5 && uEventIntensity > 0.001) {
    float asset = eventShape(vUv - 0.5, uEventType);
    float halo = exp(-abs(length(vUv - 0.5) - 0.38) * 22.0) * uEventIntensity;
    vec3 eventTint = uAccent;
    if (uEventType < 1.5 || (uEventType > 3.5 && uEventType < 4.5) || uEventType > 8.5) eventTint = vec3(1.0, 0.74, 0.16);
    else if (uEventType < 2.5 || (uEventType > 4.5 && uEventType < 6.5)) eventTint = vec3(0.28, 0.95, 1.0);
    else if (uEventType < 3.5) eventTint = vec3(1.0, 0.22, 0.82);
    else if (uEventType > 6.5 && uEventType < 8.5) eventTint = vec3(1.0, 0.18, 0.38);
    color = mix(color, color * 0.75 + eventTint * 0.25, asset * uEventIntensity * 0.3);
    color += eventTint * (asset * 0.62 + halo * 0.08) * uEventIntensity;
  }

  // Soft, contrast-preserving glow and bloom
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color += uAccent * smoothstep(0.45, 0.9, luma) * uGlow * 0.22;
  color += color * smoothstep(0.65, 0.95, luma) * uBloom * 0.25;

  color = applyTransition(vUv, color, uTransitionIndex, uTransitionProgress);
  color *= 0.92 + 0.08 * uVolume;

  // Reinhard / Filmic tonemapping curve: mathematically eliminates white-out clipping
  color = color / (color + vec3(0.8));
  // Contrast curve to keep dark space deep and colors intense
  color = pow(color, vec3(1.15));

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
