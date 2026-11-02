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
    // 3. Dreamscape: an asymmetric, slowly breathing painted atmosphere.
    vec2 drift = vec2(t * 0.025, -t * 0.018);
    float cloud = fbm(uv * vec2(3.2, 2.1) + drift + vec2(sin(uv.y * 3.0), cos(uv.x * 2.0)) * 0.22);
    float horizon = 0.5 + 0.12 * sin(uv.x * 4.0 + cloud * 2.2);
    float veil = smoothstep(horizon - 0.16, horizon + 0.2, uv.y) * cloud;
    col = mix(cam, mix(uSecondary, uPrimary, cloud), 0.14 + veil * 0.13);
    col = mix(col, uAccent * (0.65 + cloud * 0.25), smoothstep(0.68, 0.92, cloud) * 0.16);
  } else if (idx < 4.5) {
    // 4. Living Jungle: one organic tendril and softly pulsing chlorophyll field.
    float life = fbm(uv * 3.1 + vec2(t * 0.018, -t * 0.035));
    float tendril = 1.0 - smoothstep(0.012, 0.04, abs(p.x - 0.12 * sin(p.y * 5.2 + t * 0.16) - 0.06 * p.y));
    float vein = 1.0 - smoothstep(0.015, 0.055, abs(p.y - 0.24 * sin(p.x * 4.0 + t * 0.08)));
    col = mix(cam, uPrimary * (0.35 + life * 0.5) + cam * 0.42, 0.16);
    col += uSecondary * tendril * 0.2 + uAccent * vein * (0.04 + life * 0.06);
  } else if (idx < 5.5) {
    // 5. Glitch Reality: a single controlled fracture through the live image.
    float seam = abs(fract(uv.y * 5.0 + 0.5) - 0.5);
    float fracture = 1.0 - smoothstep(0.012, 0.035, seam);
    float shift = fracture * (0.012 + uBass * 0.018) * sin(uv.y * 34.0 + t * 0.22);
    vec3 broken = sampleVideo(uv + vec2(shift, 0.0));
    col = mix(cam, broken, fracture * 0.62);
    col += uAccent * fracture * 0.06;
  } else if (idx < 6.5) {
    // 6. Astral Ocean: slow caustic light and layered tide lines.
    float tide = sin(uv.y * 12.0 + sin(uv.x * 5.0 + t * 0.22) * 0.8);
    float caustic = pow(max(0.0, sin(uv.x * 15.0 + sin(uv.y * 8.0 - t * 0.18) * 1.2)), 8.0);
    float deep = smoothstep(-0.7, 0.75, tide);
    col = mix(cam, mix(uFog, uPrimary, 0.32 + deep * 0.24), 0.17);
    col += uSecondary * max(0.0, tide) * 0.075 + uAccent * caustic * 0.09;
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
  } else if (idx < 11.5) {
    // 11. Return to Reality
    float fade = 0.15 * (1.0 - smoothstep(0.0, 1.0, uEnergy));
    col = mix(cam, mix(cam, uFog * 0.4, fade), 0.15);
    col += uAccent * 0.03 * fbm(uv * 2.0);
  } else {
    // 12. Anime World: camera cel shading is the feature; this tint is deliberately quiet.
    float halo = exp(-length(p) * 2.4) * (0.08 + uBass * 0.04);
    col = mix(cam, uPrimary * 0.28 + cam * 0.72, 0.16);
    col += uAccent * halo;
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
  if (uWorldIndex > 11.5 && uWorldIndex < 12.5) {
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
  float camMix = clamp(uCameraMix, 0.56, 1.0);
  float cameraWeight = clamp(0.52 + camMix * 0.24, 0.62, 0.78);
  vec3 color = mix(world, cam, cameraWeight);

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

  // Camera looks are designed as image treatments, not decorative overlays.
  float sourceLuma = dot(cam, vec3(0.299, 0.587, 0.114));
  float edgeX = abs(sourceLuma - dot(sampleVideo(uv + vec2(0.003, 0.0)), vec3(0.299, 0.587, 0.114)));
  float edgeY = abs(sourceLuma - dot(sampleVideo(uv + vec2(0.0, 0.003)), vec3(0.299, 0.587, 0.114)));
  float edge = clamp((edgeX + edgeY) * 7.0, 0.0, 1.0);
  if (uTransform > 0.5 && uTransform < 1.5) {
    float bands = floor(sourceLuma * 5.0 + 0.5) / 5.0;
    color *= bands / max(sourceLuma, 0.08);
    color *= 1.0 - smoothstep(0.08, 0.24, edge) * 0.72;
  } else if (uTransform > 1.5 && uTransform < 2.5) {
    float graphite = 1.0 - smoothstep(0.035, 0.18, edge);
    float paperShade = 0.78 + sourceLuma * 0.2;
    color = vec3(0.88, 0.84, 0.75) * paperShade * graphite;
  } else if (uTransform > 2.5 && uTransform < 3.5) {
    float shape = smoothstep(0.22, 0.55, sourceLuma);
    color = mix(uFog * 0.45, uPrimary * 0.78, shape);
    color += uAccent * (1.0 - smoothstep(0.02, 0.16, edge)) * 0.08;
  } else if (uTransform > 3.5 && uTransform < 4.5) {
    float bands = floor(sourceLuma * 4.0 + 0.5) / 4.0;
    vec3 pigment = mix(uSecondary, uPrimary, smoothstep(0.12, 0.82, bands));
    pigment = mix(pigment, uAccent, smoothstep(0.72, 0.98, bands) * 0.55);
    color = mix(color * 0.72, pigment, 0.42);
  } else if (uTransform > 4.5 && uTransform < 5.5) {
    float scan = 0.96 + 0.04 * sin(uv.y * uResolution.y * 0.35);
    vec3 hologram = mix(vec3(0.015, 0.08, 0.12), vec3(0.08, 0.78, 0.82), sourceLuma);
    color = mix(hologram, uAccent, smoothstep(0.08, 0.22, edge) * 0.72) * scan;
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
