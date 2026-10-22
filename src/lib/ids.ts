let n = 0;

export function makeId(prefix: string) {
  n += 1;
  return `${prefix}-${Date.now().toString(36)}-${n}`;
}
