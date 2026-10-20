export const BLIT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uBloom;

void main() {
  vec2 texel = 1.0 / uResolution;
  vec3 c = texture2D(uScene, vUv).rgb;
  vec3 blur = texture2D(uScene, vUv + vec2(texel.x * 2.0, 0.0)).rgb;
  blur += texture2D(uScene, vUv - vec2(texel.x * 2.0, 0.0)).rgb;
  blur += texture2D(uScene, vUv + vec2(0.0, texel.y * 2.0)).rgb;
  blur += texture2D(uScene, vUv - vec2(0.0, texel.y * 2.0)).rgb;
  blur *= 0.25;

  float luma = dot(blur, vec3(0.299, 0.587, 0.114));
  // Selective threshold bloom for high-intensity highlights only
  vec3 bloom = blur * smoothstep(0.68, 0.95, luma) * uBloom * 0.35;
  gl_FragColor = vec4(clamp(c + bloom, 0.0, 1.0), 1.0);
}
`;
