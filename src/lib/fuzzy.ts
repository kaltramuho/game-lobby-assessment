export function scoreMatch(query: string, text: string) {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1200;
  if (t.startsWith(q)) return 900 - Math.min(180, t.length);
  const at = t.indexOf(q);
  if (at >= 0) return 640 - at * 3 - Math.min(80, t.length);

  let qi = 0;
  let score = 0;
  let streak = 0;
  let prev = -2;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] !== q[qi]) continue;
    const consecutive = i === prev + 1;
    streak = consecutive ? streak + 1 : 1;
    score += 12 + streak * 7;
    const boundary = i === 0 || t[i - 1] === ' ' || t[i - 1] === '-' || t[i - 1] === '&';
    if (boundary) score += 10;
    prev = i;
    qi += 1;
  }
  if (qi < q.length) return 0;
  return Math.max(1, score - t.length * 0.15);
}
