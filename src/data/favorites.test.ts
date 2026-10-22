import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFavs, subscribeFavs, toggleFav, writeFavs } from './favorites';

afterEach(() => {
  localStorage.clear();
});

describe('pins', () => {
  it('ignores a broken store and keeps order', () => {
    expect(readFavs()).toEqual([]);
    localStorage.setItem('merrin.favs', '{');
    expect(readFavs()).toEqual([]);
    writeFavs(['a', 'b']);
    expect(readFavs()).toEqual(['a', 'b']);
  });

  it('toggles and notifies subscribers once', () => {
    const heard = vi.fn();
    const off = subscribeFavs(heard);
    toggleFav('orchard');
    toggleFav('lamp');
    toggleFav('orchard');
    expect(readFavs()).toEqual(['lamp']);
    expect(heard).toHaveBeenCalledTimes(3);
    off();
    toggleFav('lamp');
    expect(heard).toHaveBeenCalledTimes(3);
  });
});
