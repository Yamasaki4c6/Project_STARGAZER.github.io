import { defineConfig } from 'vite';

// base: './' にしておくと、リポジトリ名がどんなURLになっても動く
export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
