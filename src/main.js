// ============================================================
//  PROJECT STARGAZER
//  ・画面いっぱいにフラクタルを描く背景（スクロールしても動かない）
//  ・文字だけがスクロールし、最後まで行くと最初に戻る（ループ）
//  ・スマホを傾けると視点がずれる（AR風）
// ============================================================

import * as THREE from 'three';
import vertexShader from './background.vert?raw';   // ?raw = ファイルの中身を文字列として読み込む（Vite の機能）
import fragmentShader from './background.frag?raw';

// ------------------------------------------------------------
// 1. 3D の準備（レンダラー・シーン・カメラ）
// ------------------------------------------------------------
const canvas = document.getElementById('canvas');

// レンダラー: シーンをキャンバスに描く係
const renderer = new THREE.WebGLRenderer({ canvas });

// 解像度の倍率。このシェーダーは 1 ピクセルごとに 100×(7〜11)×3 回ほどループするのでとても重い。
// 0.5 にすると縦横半分（ピクセル数は 1/4）で計算し、CSS で画面いっぱいに引き伸ばす。
// 重ければ下げる、軽ければ上げる。
const RENDER_SCALE = 0.5;
renderer.setPixelRatio(RENDER_SCALE);

// 背景は画面に貼り付けた板 1 枚なので、遠近のあるカメラは使わない
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ------------------------------------------------------------
// 2. 背景のシェーダー（中身は src/background.frag）
// ------------------------------------------------------------
// スマホかどうか（指で操作する画面ならスマホとみなす）
const isPhone = window.matchMedia('(pointer: coarse)').matches;

// 開始位置: 最初は START_T_FROM。タップすると START_T_DURATION 秒かけて START_T_TO へ
const START_T_FROM = 2.0;
const START_T_TO = 0.1;
const START_T_DURATION = 5;

// 色の細かさ: スクロール1周の間に COLOR_MIN → COLOR_MAX → COLOR_MIN と変わる
const COLOR_MIN = 0.2;
const COLOR_MAX = 1.2;

// uniform = JavaScript からシェーダーに渡す値
const uniforms = {
  uTime: { value: 0 },                          // 経過時間（秒）。Shadertoy の iTime
  uResolution: { value: new THREE.Vector2() },  // 描画するピクセル数。Shadertoy の iResolution
  uTilt: { value: new THREE.Vector2() },        // スマホの傾き（-1〜1）
  // ↓ 見た目の数値
  uStartT: { value: START_T_FROM },  // レイの出発位置。タップで動く（「7. タップ」を参照）
  uSteps: { value: isPhone ? 7 : 11 }, // フラクタルの繰り返し回数。スマホは軽めにする
  uTimeDivider: { value: 4.9 },      // 時間を割る数（大きいほどゆっくり）。固定
  uColorFreq: { value: COLOR_MIN },  // 色の変化の細かさ。スクロールで動く（「8. スクロール」を参照）
};

// 縦横 2×2 の板 = ちょうど画面全体を覆う大きさ（座標が -1〜1 なので）
const background = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
);
scene.add(background);

// ------------------------------------------------------------
// 3. 画面サイズに合わせる
// ------------------------------------------------------------
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  // 実際に描画しているピクセル数（画面サイズ × RENDER_SCALE）をシェーダーに教える
  renderer.getDrawingBufferSize(uniforms.uResolution.value);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------
// 4. スマホの傾き（AR風の視差）
// ------------------------------------------------------------
// tilt.x / tilt.y は -1〜1 の値。傾きに応じて視点をずらす。
const tilt = { x: 0, y: 0 };

function onOrientation(event) {
  // gamma: 左右の傾き（度）、beta: 前後の傾き（度）
  // 手に持ったときの自然な角度（前に45度くらい）を 0 とみなす
  tilt.x = THREE.MathUtils.clamp(event.gamma / 30, -1, 1);
  tilt.y = THREE.MathUtils.clamp((event.beta - 45) / 30, -1, 1);
}

// iPhone は傾きを使うのにユーザーの許可が必要（requestPermission がある）。
// 許可のダイアログはタップしたときにしか出せないので、最初のタップで求める。
// Android などは許可がいらないので、すぐに受け取り始める。
const needsPermission =
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof DeviceOrientationEvent.requestPermission === 'function';

if (needsPermission) {
  window.addEventListener('click', () => {
    DeviceOrientationEvent.requestPermission().then((state) => {
      if (state === 'granted') window.addEventListener('deviceorientation', onOrientation);
    });
  }, { once: true });
} else {
  window.addEventListener('deviceorientation', onOrientation);
}

// PC で確認するとき用: マウスの位置を傾きの代わりに使う
window.addEventListener('mousemove', (event) => {
  tilt.x = (event.clientX / window.innerWidth) * 2 - 1;
  tilt.y = (event.clientY / window.innerHeight) * 2 - 1;
});

// ------------------------------------------------------------
// 5. スクロールのループ
// ------------------------------------------------------------
// 上下の端にコピーを置いて、端に着いたら反対側の同じ見た目の場所へ瞬間移動する。
//
//   [見出し4のコピー]  ← 一番上。ここに来たら本物の見出し4へ移動
//   [見出し1]          ← 最初はここを表示
//   [見出し2]
//   [見出し3]
//   [見出し4]
//   [見出し1のコピー]  ← 一番下。ここに来たら本物の見出し1へ移動
//
// 移動先は見た目がまったく同じなので、つなぎ目が見えずに上にも下にもループする。
const content = document.getElementById('content');
const sections = content.querySelectorAll('.section');
const firstSection = sections[0];
const lastSection = sections[sections.length - 1];

content.append(firstSection.cloneNode(true));  // 一番下に見出し1のコピー
content.prepend(lastSection.cloneNode(true));  // 一番上に見出し4のコピー

// ブラウザが前回のスクロール位置を復元しないようにして、見出し1から始める
history.scrollRestoration = 'manual';
window.scrollTo(0, firstSection.offsetTop);

// 本物の見出し1から見出し1のコピーまでの距離 = 1周分の長さ
function getLoopLength() {
  return lastSection.offsetTop + lastSection.offsetHeight - firstSection.offsetTop;
}

window.addEventListener('scroll', () => {
  const loopLength = getLoopLength();
  // これ以上下にスクロールできない位置（ブラウザの拡大率によっては小数になるので 1px の余裕を持たせる）
  const bottom = document.documentElement.scrollHeight - window.innerHeight - 1;

  if (window.scrollY <= 0) {
    window.scrollTo(0, window.scrollY + loopLength);  // 一番上 → 1周分下へ
  } else if (window.scrollY >= bottom) {
    window.scrollTo(0, window.scrollY - loopLength);  // 一番下 → 1周分上へ
  }
});

// ------------------------------------------------------------
// 6. 読み込み画面（数字だけ）
// ------------------------------------------------------------
// LoadingManager を GLTFLoader などに渡すと、読み込みの進み具合がここに届く。
// 例: new GLTFLoader(loadingManager).load('models/xxx.glb', (gltf) => { ... });
// 今は読み込むファイルがないので、下の showPage() ですぐ消している。
const loadingEl = document.getElementById('loading');
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, loaded, total) => {
  loadingEl.textContent = Math.round((loaded / total) * 100);
};
loadingManager.onLoad = showPage;

function showPage() {
  loadingEl.textContent = 100;
  loadingEl.classList.add('hidden');
}
showPage(); // ← モデルを読み込むようになったら、この行は消す

// ------------------------------------------------------------
// 7. タップで開始位置を動かす
// ------------------------------------------------------------
let tapTime = null; // タップした時刻（ミリ秒）。まだタップしていなければ null

window.addEventListener('click', () => {
  if (tapTime === null) tapTime = performance.now(); // 最初のタップだけ受け付ける
});

function updateStartT() {
  if (tapTime === null) return;
  // タップしてからの経過割合（0 → 1）。5秒たったら 1 で止める
  const progress = Math.min((performance.now() - tapTime) / 1000 / START_T_DURATION, 1);
  // 動き始めと終わりをなめらかにする（smoothstep: 0→1 を S字カーブにする）
  const eased = progress * progress * (3 - 2 * progress);
  uniforms.uStartT.value = START_T_FROM + (START_T_TO - START_T_FROM) * eased;
}

// ------------------------------------------------------------
// 8. スクロールで色の細かさを変える
// ------------------------------------------------------------
function updateColorFreq() {
  // 1周の中のどこにいるか（見出し1の位置で 0、1周で 1）
  const loopPosition = (window.scrollY - firstSection.offsetTop) / getLoopLength();
  // cos を使うと 0 と 1 で同じ値になるので、ループのつなぎ目で色が跳ばない
  // wave は 0 → 1 → 0 と1周で山を1つ描く
  const wave = (1 - Math.cos(loopPosition * Math.PI * 2)) / 2;
  uniforms.uColorFreq.value = COLOR_MIN + (COLOR_MAX - COLOR_MIN) * wave;
}

// ------------------------------------------------------------
// 9. 毎フレームの処理
// ------------------------------------------------------------
const clock = new THREE.Timer(); // 経過時間を測る

function animate() {
  clock.update();
  uniforms.uTime.value = clock.getElapsed();

  updateStartT();
  updateColorFreq();

  // 傾きにいきなり飛ばず、少しずつ近づける（0.05 = 1フレームで残りの5%進む）
  uniforms.uTilt.value.lerp(tilt, 0.05);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
