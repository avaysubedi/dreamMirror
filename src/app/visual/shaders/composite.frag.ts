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
    // 2. Cloud Kingdom
    float clouds = fbm(uv * vec2(2.5, 1.4) + vec2(t * 0.04, 0.0));
    float rays = pow(max(0.0, 1.0 - abs(p.x * 1.4 + 0.05 * sin(t))), 4.0);
    col = mix(uFog * 0.5, cam, 0.45);
    col += mix(uPrimary, uAccent, clouds) * 0.35;
    col += uAccent * rays * 0.22 * (0.4 + uMid);
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
    // 4. Rainbow Warp
    float melt = fbm(uv * 4.5 + t * 0.2);
    col = hueRotate(cam, melt * 0.35 + uMid * 0.2 + t * 0.03);
    col = mix(col, uPrimary, 0.18);
    col += uAccent * pow(melt, 2.0) * 0.28;
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
    // 6. Astral Ocean
    float wave = sin(uv.y * 18.0 + t * 1.4 + uBass * 4.0) * 0.5 + 0.5;
    float caustic = fbm(uv * 7.0 + vec2(t * 0.15, -t * 0.1));
    col = mix(cam, mix(uPrimary, uSecondary, wave), 0.32);
    col += uAccent * caustic * 0.18;
    col *= 0.8 + 0.2 * wave;
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

  if (uPixelSort > 0.01) {
    float lum = dot(cam, vec3(0.299, 0.587, 0.114));
    vec2 suv = uv + vec2(0.0, (lum - 0.5) * uPixelSort * 0.12);
    cam = mix(cam, sampleVideo(suv), uPixelSort);
  }

  vec3 world = worldOverlay(vUv, cam, uWorldIndex);
  float camMix = clamp(uCameraMix, 0.18, 1.0);
  vec3 color = mix(world, cam, camMix * 0.5 + 0.2);

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
