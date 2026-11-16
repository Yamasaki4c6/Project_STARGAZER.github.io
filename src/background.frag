// フラクタルのレイマーチング（Shadertoy のコードを Three.js 用に移したもの）
//
// Shadertoy との対応:
//   iTime       → uTime
//   iResolution → uResolution
//   fragCoord   → gl_FragCoord.xy
//   fragColor   → gl_FragColor

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uTilt; // スマホの傾き（-1〜1）。視点をずらすのに使う

// 見た目を決める数値。いじると雰囲気が変わる
#define START_T        0.8    // レイの出発位置（大きいほど奥から始まる）
#define FRACTAL_STEPS  10.0   // フラクタルの繰り返し回数（多いほど細かいが重い）
#define TIME_DIVIDER   8.0    // 時間を割る数（大きいほどゆっくり動く）
#define COLOR_FREQ     0.2    // 色の変化の細かさ

// 2D回転行列を返す関数
mat2 rot(float a) {
  float c = sin(a), s = cos(a);
  return mat2(c, s, -s, c);
}

void main() {
  // 画面座標の正規化
  vec2 uv = (0.5 * uResolution - gl_FragCoord.xy) / uResolution.y;
  vec3 col = vec3(0.0);
  float t = START_T;

  // 傾きの分だけ視点（レイの出発点）を横・縦にずらす
  vec2 shift = uTilt * 0.15;

  // レイマーチングのループ
  for (float i = 0.0; i < 100.0; i++) {
    // 現在のレイの先端座標
    vec3 p = vec3(uv * t + shift, t - 1.3) + i / 100000.0;

    vec3 z = p;
    vec3 x = vec3(0.0);
    float scale = 1.0;
    float r = 0.0;
    float c = 0.0;

    // フラクタルの生成ループ
    for (float j = 0.0; j < FRACTAL_STEPS; j++) {
      r = length(z);
      if (r > 5.0) break;

      scale *= r * 5.0;
      c += dot(z, p);

      // 空間をねじる
      x = z / (r * r) * 6.28318 + vec3(uTime / TIME_DIVIDER);
      for (int k = 0; k < 3; k++) {
        z.xy *= rot(x.z);
        z = z.zxy;
        x = x.zxy;
      }
      z = p - z * (r * r * r);
    }

    // 色の計算と蓄積
    vec3 palette = cos(c * COLOR_FREQ * vec3(1.0, 2.0, 3.0) + vec3(c));
    col += exp(palette - vec3(60000.0 / scale + 5.3));

    // 次のステップへ
    t += r / scale;
  }

  gl_FragColor = vec4(col, 1.0);
}
