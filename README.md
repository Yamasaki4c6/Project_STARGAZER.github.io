# PROJECT STARGAZER

天体観測会の告知サイト。学内に貼る QR コードの飛び先＝ポスター代わり。
スマホ優先、Three.js による 3D パーティクル演出。

## 開発

```bash
npm install
npm run dev      # http://localhost:5173 （同じWi-Fiのスマホからも見られる）
npm run build    # dist/ に出力
```

## 公開（GitHub Pages）

`main` に push すると GitHub Actions がビルドして公開します。
初回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を
**GitHub Actions** にしてください。

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | セクション（文章）と HUD |
| `src/config.js` | 開催日時・各セクションの形・粒の数・光のにじみ |
| `src/main.js` | レンダラー、スクロール連動のカメラ、ローディング、HUD |
| `src/scene/particles.js` | 4 つの形の間をモーフィングするパーティクル（GLSL） |
| `src/scene/shapes.js` | 仮の形（銀河・環の惑星・月・文字）と GLB からの点の取り出し |
| `src/scene/stars.js` | 背景の星 |
| `public/models/` | Blender / Houdini から書き出した GLB の置き場 |

## Blender / Houdini からの素材の入れ方

1. `.glb` で書き出す（Blender: File → Export → glTF 2.0、Houdini: ROP glTF Output）
2. `public/models/` に置く
3. `src/config.js` の `shapes` の該当箇所を `'models/xxx.glb'` に書き換える

読み込みに失敗した場合は仮の形（銀河）にフォールバックし、コンソールに警告が出ます。
