import * as THREE from 'three';

// 4 つの形（aShape0..3）の間を uMorph (0.0〜3.0) でモーフィングする点群。
// 形の切り替わり途中はノイズで「ほどけて」から組み上がる。

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec2  uPointer;
  attribute vec3 aShape0;
  attribute vec3 aShape1;
  attribute vec3 aShape2;
  attribute vec3 aShape3;
  attribute float aSeed;
  varying float vAlpha;
  varying vec3 vColor;

  // 安価な 3D ノイズ
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }
  vec3 curl(vec3 p) {
    return vec3(sin(p.y * 1.7 + uTime * 0.6) + cos(p.z * 1.3),
                sin(p.z * 1.5 - uTime * 0.5) + cos(p.x * 1.9),
                sin(p.x * 1.3 + uTime * 0.4) + cos(p.y * 1.1));
  }

  void main() {
    // 粒ごとに少しずつ遅れて切り替える
    float m = clamp(uMorph + (aSeed - 0.5) * 0.35, 0.0, 3.0);
    float w0 = clamp(1.0 - abs(m - 0.0), 0.0, 1.0);
    float w1 = clamp(1.0 - abs(m - 1.0), 0.0, 1.0);
    float w2 = clamp(1.0 - abs(m - 2.0), 0.0, 1.0);
    float w3 = clamp(1.0 - abs(m - 3.0), 0.0, 1.0);
    vec3 pos = aShape0 * w0 + aShape1 * w1 + aShape2 * w2 + aShape3 * w3;

    // 遷移中の散らばり
    float f = fract(m);
    float scatter = sin(f * 3.14159);
    scatter *= scatter;
    pos += curl(pos * 1.2 + aSeed * 10.0) * scatter * 0.55;
    pos += hash3(pos + aSeed) * scatter * 0.25;

    // 静止中のゆらぎ
    pos += curl(pos * 0.8 + aSeed) * 0.012;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // ポインタ付近の粒を押しのける（スクリーン空間）
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    float push = smoothstep(0.25, 0.0, length(d));
    mv.xy += normalize(d + 1e-4) * push * 0.18;

    gl_Position = projectionMatrix * mv;
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * tw / -mv.z;

    vAlpha = (0.25 + 0.45 * tw) * (1.0 - scatter * 0.4);
    // 青白〜わずかに暖色
    vColor = mix(vec3(0.62, 0.78, 1.0), vec3(1.0, 0.9, 0.78), smoothstep(0.75, 1.0, aSeed));
    vColor += push * vec3(0.3, 0.35, 0.5);
  }
`;

const frag = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export function createParticles(shapes, pixelRatio) {
  const count = shapes[0].length / 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3)); // バウンディング用
  shapes.forEach((s, i) => g.setAttribute(`aShape${i}`, new THREE.BufferAttribute(s, 3)));
  for (let i = shapes.length; i < 4; i++) g.setAttribute(`aShape${i}`, new THREE.BufferAttribute(shapes[shapes.length - 1], 3));
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random();
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uSize: { value: 7 },
      uPointer: { value: new THREE.Vector2(9, 9) },
    },
  });
  return new THREE.Points(g, mat);
}
