# 3D 素材置き場

Blender / Houdini から書き出した `.glb` をここに置き、`src/config.js` の `shapes` に
`'models/ファイル名.glb'` と書くと、そのセクションのパーティクルがその形になります。

- メッシュ → 表面から点をランダムに拾う
- 点群（Houdini の points のみ / Blender の頂点だけのオブジェクト）→ 頂点をそのまま使う
- 大きさ・位置は自動で正規化（原点中心・半径 1.6 前後）
- 目安: 1 ファイル 2MB 以下。Blender の glTF 書き出しで Draco 圧縮 ON 推奨
