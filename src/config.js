// ============================================================
//  サイト全体の設定。ここを書き換えれば中身が変わります。
// ============================================================

export const CONFIG = {
  // イベント開始日時（未定なら null。決まったら '2026-12-13T18:30:00+09:00' のように）
  eventDate: null,

  // セクションごとのパーティクルの形。index.html の data-shape の番号と対応。
  //  - 'galaxy' / 'ringed' / 'moon' / 'text:文字' … コードで作る仮の形
  //  - 'models/xxx.glb'                         … Blender/Houdini から書き出した GLB
  //    （public/models/ に置く。メッシュの表面から点を拾う。点群だけのGLBもOK）
  shapes: [
    'galaxy',
    'ringed',
    'moon',
    'text:STARGAZER',
  ],

  // パーティクル数（スマホは自動で半分）
  particleCount: 24000,
  starCount: 7000,

  // ポストエフェクト（光のにじみ）
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.12 },
};
