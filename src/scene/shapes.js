import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

// どの形も「count 個の点の座標 (Float32Array, xyz)」を返す。
// 大きさはだいたい半径 1.6 前後にそろえる。

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** 渦巻銀河 */
export function galaxy(count) {
  const out = new Float32Array(count * 3);
  const arms = 3;
  for (let i = 0; i < count; i++) {
    const core = Math.random() < 0.18;
    const r = core ? Math.abs(gauss()) * 0.25 : Math.pow(Math.random(), 0.8) * 2.2;
    const arm = (i % arms) / arms * Math.PI * 2;
    const spin = r * 2.6;
    const spread = 0.12 + r * 0.12;
    const a = arm + spin + gauss() * spread;
    out[i * 3] = Math.cos(a) * r + gauss() * 0.04;
    out[i * 3 + 1] = gauss() * (core ? 0.12 : 0.04) * (1.4 - r * 0.4);
    out[i * 3 + 2] = Math.sin(a) * r + gauss() * 0.04;
  }
  return out;
}

/** 環のある惑星 */
export function ringed(count) {
  const out = new Float32Array(count * 3);
  const planet = Math.floor(count * 0.45);
  for (let i = 0; i < count; i++) {
    let x, y, z;
    if (i < planet) {
      const v = new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(0.85);
      x = v.x; y = v.y; z = v.z;
    } else {
      const r = rand(1.15, 2.0);
      const band = Math.sin(r * 22) > -0.3 ? 1 : 0.4; // 環のすき間
      if (Math.random() > band) { i--; continue; }
      const a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; y = gauss() * 0.01; z = Math.sin(a) * r;
    }
    // 少し傾ける
    const t = 0.42;
    out[i * 3] = x;
    out[i * 3 + 1] = y * Math.cos(t) - z * Math.sin(t);
    out[i * 3 + 2] = y * Math.sin(t) + z * Math.cos(t);
  }
  return out;
}

/** クレーターっぽい凹凸のある月 */
export function moon(count) {
  const out = new Float32Array(count * 3);
  const craters = Array.from({ length: 26 }, () => ({
    c: new THREE.Vector3(gauss(), gauss(), gauss()).normalize(),
    s: rand(0.08, 0.32),
  }));
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(gauss(), gauss(), gauss()).normalize();
    let h = 0;
    for (const k of craters) {
      const d = v.distanceTo(k.c) / k.s;
      if (d < 1.2) h += d < 1 ? -0.05 * (1 - d * d) : 0.03 * (1.2 - d) * 5;
    }
    v.multiplyScalar(1.3 + h);
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

/** 文字をキャンバスに描いて点をサンプリング */
export function text(count, str) {
  const W = 1024, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 200;
  do {
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    size -= 8;
  } while (ctx.measureText(str).width > W * 0.92 && size > 20);
  ctx.fillText(str, W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  }
  const out = new Float32Array(count * 3);
  const scale = 4.0 / W;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * (pts.length / 2)) * 2;
    out[i * 3] = (pts[j] - W / 2 + Math.random() * 2) * scale;
    out[i * 3 + 1] = -(pts[j + 1] - H / 2 + Math.random() * 2) * scale;
    out[i * 3 + 2] = gauss() * 0.03;
  }
  return out;
}

// ---------- GLB（Blender / Houdini） ----------
const gltf = new GLTFLoader();
const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltf.setDRACOLoader(draco);
gltf.setMeshoptDecoder(MeshoptDecoder);

/**
 * GLB から点を取り出す。
 *  - メッシュ: 表面を面積に応じてランダムサンプリング
 *  - Points（点群）: 頂点をそのまま（足りなければ繰り返し）
 * 全体を原点中心・半径 ~1.6 に正規化する。
 */
export async function fromGLB(url, count, manager) {
  const loader = manager ? new GLTFLoader(manager) : gltf;
  if (manager) { loader.setDRACOLoader(draco); loader.setMeshoptDecoder(MeshoptDecoder); }
  const { scene } = await loader.loadAsync(url);
  scene.updateMatrixWorld(true);

  const meshes = [], clouds = [];
  scene.traverse((o) => {
    if (o.isMesh) meshes.push(o);
    else if (o.isPoints) clouds.push(o);
  });

  const out = new Float32Array(count * 3);
  const p = new THREE.Vector3();

  if (meshes.length) {
    // メッシュごとに面積比で点数を配分
    const samplers = meshes.map((m) => {
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      const s = new MeshSurfaceSampler(new THREE.Mesh(g)).build();
      return { s, area: s.distribution ? s.distribution[s.distribution.length - 1] : 1 };
    });
    const total = samplers.reduce((a, b) => a + b.area, 0);
    let i = 0;
    samplers.forEach(({ s, area }, k) => {
      const n = k === samplers.length - 1 ? count - i : Math.round(count * area / total);
      for (let j = 0; j < n && i < count; j++, i++) { s.sample(p); p.toArray(out, i * 3); }
    });
  } else if (clouds.length) {
    const all = [];
    clouds.forEach((c) => {
      const pos = c.geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) all.push(p.fromBufferAttribute(pos, j).applyMatrix4(c.matrixWorld).clone());
    });
    for (let i = 0; i < count; i++) all[i % all.length].toArray(out, i * 3);
  } else {
    throw new Error(`${url} にメッシュも点群も見つかりません`);
  }
  return normalize(out, 1.6);
}

function normalize(arr, radius) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < arr.length; i += 3) box.expandByPoint(v.fromArray(arr, i));
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() / 2 || 1;
  const k = radius / r;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] = (arr[i] - c.x) * k; arr[i + 1] = (arr[i + 1] - c.y) * k; arr[i + 2] = (arr[i + 2] - c.z) * k;
  }
  return arr;
}

/** CONFIG.shapes の 1 要素を解決 */
export async function resolveShape(spec, count, manager) {
  if (spec.endsWith('.glb') || spec.endsWith('.gltf')) {
    try { return await fromGLB(import.meta.env.BASE_URL + spec, count, manager); }
    catch (e) { console.warn('[shape] GLB 読み込み失敗、仮の形を使います:', spec, e); return galaxy(count); }
  }
  if (spec.startsWith('text:')) return text(count, spec.slice(5));
  return ({ galaxy, ringed, moon }[spec] || galaxy)(count);
}
