export const PARTICLE_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPointScale;
uniform float uBass;
varying vec3 vColor;
varying float vDepthFade;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mv.z, 0.8);
  // Distance fade so particles close to camera gracefully dissolve instead of blowing up
  vDepthFade = smoothstep(1.0, 3.0, dist);
  float psize = aSize * uPointScale * (1.0 + uBass * 0.4) * (70.0 / dist);
  // Strictly clamp point size to prevent screen-filling white circles
  gl_PointSize = clamp(psize, 1.0, 36.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vDepthFade;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float alpha = smoothstep(0.5, 0.08, d);
  if (alpha < 0.02) discard;
  // Soft celestial stardust luminance
  gl_FragColor = vec4(vColor * 0.75, alpha * 0.6 * vDepthFade);
}
`;
