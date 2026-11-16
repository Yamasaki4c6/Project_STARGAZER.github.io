// 板の頂点をそのまま画面の四隅に置く（カメラの計算はしない）
void main() {
  gl_Position = vec4(position, 1.0);
}
