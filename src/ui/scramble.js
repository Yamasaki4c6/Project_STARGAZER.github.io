// 文字が乱数からデコードされていく演出
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-/<>[]';

export function scramble(el, { duration = 900 } = {}) {
  const target = el.dataset.text ?? (el.dataset.text = el.textContent);
  const start = performance.now();
  cancelAnimationFrame(el._raf);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const n = Math.floor(target.length * t);
    let s = target.slice(0, n);
    for (let i = n; i < target.length; i++) {
      s += target[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = s;
    if (t < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
