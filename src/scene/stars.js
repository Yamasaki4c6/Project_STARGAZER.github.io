import * as THREE from 'three';

// 背景の星。大きな球殻に配置し、温度で色を変えてまたたかせる。

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 100.0);
    gl_PointSize = aSize * uPixelRatio * (0.7 + 0.3 * tw);
    vColor = aColor;
    vAlpha = tw;
  }
`;
const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

const palette = [
  [0.62, 0.72, 1.0], [0.8, 0.86, 1.0], [1.0, 1.0, 1.0], [1.0, 0.95, 0.85], [1.0, 0.82, 0.65],
];

export function createStars(count, pixelRatio) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    // 天の川っぽく一方向の帯に集める
    if (Math.random() < 0.45) { v.y *= 0.15; v.normalize(); }
    v.multiplyScalar(30 + Math.random() * 40);
    pos.set([v.x, v.y, v.z], i * 3);
    const big = Math.random();
    size[i] = big > 0.985 ? 6 + Math.random() * 4 : 1.2 + Math.pow(Math.random(), 3) * 3.5;
    seed[i] = Math.random();
    col.set(palette[Math.floor(Math.random() * palette.length)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
  });
  return new THREE.Points(g, m);
}
