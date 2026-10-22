import { describe, expect, it, vi } from 'vitest';
import { emit, EV, on } from './bus';

describe('bus', () => {
  it('delivers a detail and then stops', () => {
    const heard = vi.fn();
    const off = on(EV.play, heard);
    emit(EV.play, 'glass-orchard');
    off();
    emit(EV.play, 'again');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith('glass-orchard');
  });
});
