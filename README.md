# PROJECT STARGAZER

天体観測会の告知サイト。学内に貼る QR コードの飛び先（ポスター代わり）。

## いまの構成

- 背景: 画面に固定されたフラクタルのシェーダー（Shadertoy から移植。重いので解像度を半分にして描画）
- 文字: 背景の上をスクロールし、最後まで行くと先頭に戻る（ループ）
- スマホを傾けるとカメラが動く（iPhone は最初のタップで許可を求める）。PC ではマウスで代用
- 読み込み画面: 数字だけ（モデルを読み込むようになったら進捗が出る）

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | ページの骨組みと文言 |
| `src/style.css` | 見た目 |
| `src/main.js` | 背景の描画・傾き・スクロールのループ・読み込み画面 |
| `src/background.frag` | 背景のシェーダー本体（見た目の数値は先頭の `#define`） |
| `src/background.vert` | 背景の板を画面いっぱいに置くだけのシェーダー |
| `.github/workflows/deploy.yml` | `main` に push すると GitHub Pages に公開 |

## 手元で動かす

```bash
npm install
npm run dev   # 表示された URL をブラウザで開く
```
