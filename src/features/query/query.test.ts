import { describe, expect, it } from 'vitest';
import { clearFilterParams } from './query';

describe('clear filters', () => {
  it('drops the lobby params and leaves demo flags', () => {
    const params = new URLSearchParams('cat=slots&provider=calder&tag=new&q=glass&sort=rtp&fail=catalog');
    clearFilterParams(params);
    expect(params.toString()).toBe('fail=catalog');
  });
});
