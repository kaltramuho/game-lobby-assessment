export function arrowStep(key: string): -1 | 0 | 1 {
  const rtl = document.documentElement.dir === 'rtl';
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (key === 'ArrowDown' || key === forward) return 1;
  if (key === 'ArrowUp' || key === back) return -1;
  return 0;
}
