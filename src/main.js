// ============================================================
//  PROJECT STARGAZER
//  ・画面中央に cube を置いた 3D の背景（スクロールしても動かない）
//  ・文字だけがスクロールし、最後まで行くと最初に戻る（ループ）
//  ・スマホを傾けるとカメラが動き、cube を回り込んで見られる（AR風）
// ============================================================

import * as THREE from 'three';

// ------------------------------------------------------------
// 1. 3D の準備（レンダラー・シーン・カメラ）
// ------------------------------------------------------------
const canvas = document.getElementById('canvas');

// レンダラー: シーンをキャンバスに描く係
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// シーン: 物を置く空間
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// カメラ: (画角, 縦横比, 近くの描画限界, 遠くの描画限界)
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const cameraBasePosition = new THREE.Vector3(0, 0, 5); // 傾けていないときのカメラ位置
camera.position.copy(cameraBasePosition);

// ------------------------------------------------------------
// 2. 仮置きの cube（あとで自作のモデルに差し替える）
// ------------------------------------------------------------
const geometry = new THREE.BoxGeometry(1, 1, 1);                     // 形: 1×1×1 の箱
const material = new THREE.MeshStandardMaterial({ color: 0x888888 }); // 見た目: グレー
const cube = new THREE.Mesh(geometry, material);
cube.rotation.set(0.5, 0.7, 0); // 立体に見えるよう少し傾けておく
scene.add(cube);

// MeshStandardMaterial は光がないと真っ黒なので、ライトを置く
scene.add(new THREE.AmbientLight(0xffffff, 0.4));          // 全体をうっすら照らす光
const light = new THREE.DirectionalLight(0xffffff, 1.5);   // 一方向から当たる光
light.position.set(3, 4, 5);
scene.add(light);

// ------------------------------------------------------------
// 3. 画面サイズに合わせる
// ------------------------------------------------------------
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------
// 4. スマホの傾き（AR風の視差）
// ------------------------------------------------------------
// tilt.x / tilt.y は -1〜1 の値。傾きに応じてカメラをずらす。
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

window.addEventListener('scroll', () => {
  // 本物の見出し1から見出し1のコピーまでの距離 = 1周分の長さ
  const loopLength = lastSection.offsetTop + lastSection.offsetHeight - firstSection.offsetTop;
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
// 7. 毎フレームの処理
// ------------------------------------------------------------
const cameraTarget = new THREE.Vector3();

function animate() {
  // 傾きの分だけずらした位置を目標にする
  cameraTarget.set(
    cameraBasePosition.x + tilt.x * 2,
    cameraBasePosition.y - tilt.y * 2,
    cameraBasePosition.z
  );
  // いきなり飛ばずに少しずつ近づける（0.05 = 1フレームで残りの5%進む）
  camera.position.lerp(cameraTarget, 0.05);
  camera.lookAt(cube.position); // 常に cube の方を向く

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
