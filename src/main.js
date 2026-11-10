import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { CONFIG } from './config.js';
import { resolveShape } from './scene/shapes.js';
import { createParticles } from './scene/particles.js';
import { createStars } from './scene/stars.js';
import { scramble } from './ui/scramble.js';

const isMobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pixelRatio = Math.min(devicePixelRatio, isMobile ? 1.75 : 2);
document.body.classList.add('is-loading');

// ---------- Renderer / Scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const stars = createStars(isMobile ? CONFIG.starCount / 2 : CONFIG.starCount, pixelRatio);
scene.add(stars);

const pivot = new THREE.Group(); // パーティクルの置き場所（画面幅で位置を変える）
scene.add(pivot);
let particles;

// ---------- Loading ----------
const manager = new THREE.LoadingManager();
let real = 1, fake = 0;
manager.onProgress = (_, loaded, total) => { real = loaded / total; };
manager.onStart = () => { real = 0; };
const loaderNum = document.getElementById('loader-num');
const loaderBar = document.getElementById('loader-bar');

async function load() {
  await document.fonts.ready; // 文字形状をキャンバスに描く前にフォントを待つ
  const count = isMobile ? CONFIG.particleCount / 2 : CONFIG.particleCount;
  const shapes = await Promise.all(CONFIG.shapes.slice(0, 4).map((s) => resolveShape(s, count, manager)));
  particles = createParticles(shapes, pixelRatio);
  pivot.add(particles);
}
const loaded = load();

const loadStart = performance.now();
function tickLoader() {
  fake = Math.min(1, (performance.now() - loadStart) / 1600);
  const v = Math.min(fake, real);
  loaderNum.textContent = String(Math.floor(v * 100)).padStart(3, '0');
  loaderBar.style.width = `${v * 100}%`;
  return v >= 1;
}

// ---------- Sections / Scroll ----------
const sections = [...document.querySelectorAll('.sec')];
document.getElementById('sec-total').textContent = String(sections.length).padStart(2, '0');
let scrollTarget = 0, scrollCur = 0;
// 各セクションの上端位置から「今どのセクションの何割か」を求める（アドレスバーの伸縮に強い）
let tops = [];
const measure = () => { tops = sections.map((s) => s.offsetTop); };
const onScroll = () => {
  const y = scrollY;
  let i = 0;
  while (i < tops.length - 1 && y >= tops[i + 1]) i++;
  const span = i < tops.length - 1 ? tops[i + 1] - tops[i] : 1;
  scrollTarget = Math.min(sections.length - 1, i + Math.min(1, Math.max(0, (y - tops[i]) / span)));
};
addEventListener('scroll', onScroll, { passive: true });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    e.target.querySelectorAll('[data-scramble]').forEach((el) => scramble(el));
    const i = sections.indexOf(e.target);
    document.getElementById('sec-index').textContent = String(i + 1).padStart(2, '0');
  });
}, { threshold: 0.45 });

// カメラのキーフレーム（セクションごと）
const camKeys = [
  { pos: [0, 2.6, 4.4], look: [0, 0, 0] },
  { pos: [3.4, 0.9, 3.2], look: [0, 0, 0] },
  { pos: [-0.6, 0.2, 4.3], look: [0, 0, 0] },
  { pos: [0, 0, 5.2], look: [0, 0, 0] },
];
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), look = new THREE.Vector3();
const ease = (t) => t * t * (3 - 2 * t);
function cameraAt(s) {
  const i = Math.min(camKeys.length - 2, Math.floor(s));
  const t = ease(Math.min(1, s - i));
  tmpA.fromArray(camKeys[i].pos).lerp(tmpB.fromArray(camKeys[i + 1].pos), t);
  look.fromArray(camKeys[i].look).lerp(tmpB.fromArray(camKeys[i + 1].look), t);
  return tmpA;
}

// ---------- Pointer / Gyro ----------
const pointer = new THREE.Vector2(9, 9), parallax = new THREE.Vector2(), parallaxCur = new THREE.Vector2();
addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  parallax.copy(pointer);
});
addEventListener('pointerleave', () => pointer.set(9, 9));
addEventListener('deviceorientation', (e) => {
  if (e.gamma == null) return;
  parallax.set(THREE.MathUtils.clamp(e.gamma / 30, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1));
});

// ---------- HUD ----------
const raEl = document.getElementById('ra'), decEl = document.getElementById('dec');
const progEl = document.getElementById('progress'), cdEl = document.getElementById('countdown');
const pad = (n) => String(Math.floor(n)).padStart(2, '0');
function updateHUD(s, t) {
  const ra = (s * 5.3 + t * 0.002) % 24;
  raEl.textContent = `${pad(ra)}h ${pad((ra % 1) * 60)}m ${pad((ra * 60 % 1) * 60)}s`;
  const dec = Math.sin(s * 0.9 + 0.3) * 62;
  decEl.textContent = `${dec < 0 ? '−' : '+'}${pad(Math.abs(dec))}° ${pad((Math.abs(dec) % 1) * 60)}′ ${pad((Math.abs(dec) * 60 % 1) * 60)}″`;
  progEl.style.width = `${(s / (sections.length - 1)) * 100}%`;
  if (CONFIG.eventDate) {
    const ms = Math.max(0, new Date(CONFIG.eventDate) - Date.now());
    cdEl.textContent = `${pad(ms / 864e5)}:${pad(ms / 36e5 % 24)}:${pad(ms / 6e4 % 60)}:${pad(ms / 1e3 % 60)}`;
  }
}

// ---------- Resize ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w * (isMobile ? 0.5 : 1), h * (isMobile ? 0.5 : 1));
  camera.aspect = w / h;
  // 縦長画面ではオブジェクトが小さくなりすぎないよう画角を広げる
  camera.fov = w / h < 0.8 ? 60 : 45;
  camera.updateProjectionMatrix();
  // 横長: 右寄せ / 縦長: 上寄せ（下にテキストが来るため）
  if (w / h > 1.1) { pivot.position.set(1.2, 0, 0); pivot.scale.setScalar(1); }
  else { pivot.position.set(0, 1.0, 0); pivot.scale.setScalar(0.8); }
  measure();
  onScroll();
}
addEventListener('resize', resize);
resize();

// ---------- Loop ----------
const clock = new THREE.Timer();
let started = false;
function frame() {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsed();

  if (!started && tickLoader() && particles) {
    started = true;
    document.body.classList.remove('is-loading');
    document.getElementById('loader').classList.add('is-done');
    sections.forEach((s) => io.observe(s));
  }

  scrollCur += (scrollTarget - scrollCur) * (reduced ? 1 : Math.min(1, dt * 4));
  parallaxCur.lerp(parallax, Math.min(1, dt * 2));

  const c = cameraAt(scrollCur);
  camera.position.set(c.x + parallaxCur.x * 0.35, c.y + parallaxCur.y * 0.25, c.z);
  camera.lookAt(look);

  stars.material.uniforms.uTime.value = t;
  stars.rotation.y = t * 0.004 + scrollCur * 0.15;

  if (particles) {
    const u = particles.material.uniforms;
    u.uTime.value = t;
    u.uMorph.value = scrollCur;
    u.uPointer.value.copy(pointer);
    // 最後の文字の形では正面を向くように回転を戻す
    const spin = reduced ? 0 : THREE.MathUtils.euclideanModulo(t * 0.06 + Math.PI, Math.PI * 2) - Math.PI;
    particles.rotation.y = spin * (1 - THREE.MathUtils.clamp(scrollCur - 2, 0, 1));
  }

  updateHUD(scrollCur, t);
  composer.render();
  requestAnimationFrame(frame);
}
loaded.catch((e) => console.error(e)).finally(() => { if (real === 0) real = 1; });
manager.onLoad = () => { real = 1; };
requestAnimationFrame(frame);
