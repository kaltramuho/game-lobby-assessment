import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import games from '../../public/games.json';
import promos from '../../public/promos.json';
import walletFixture from '../../public/wallet.json';
import { App } from './App';

function installBrowser() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = String(url);
      const body = path.includes('promo') ? promos : path.includes('wallet') ? walletFixture : games;
      return { ok: true, json: async () => body };
    }),
  );
  HTMLCanvasElement.prototype.getContext = (() => ({
    clearRect() {},
    fillText() {},
    setTransform() {},
    font: '',
    fillStyle: '',
    textAlign: 'left',
    textBaseline: 'middle',
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = () => undefined;
  window.scrollTo = () => undefined;
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  installBrowser();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('lobby', () => {
  it('opens the deep link and clears it back to the full floor', async () => {
    window.history.replaceState(null, '', '/?cat=slots&provider=calder&tag=new&sort=rtp');
    render(<App />);
    expect(await screen.findByText('2 titles', {}, { timeout: 3000 })).toBeTruthy();
    expect((screen.getByRole('combobox', { name: /sort/i }) as HTMLSelectElement).value).toBe('rtp');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('100 titles')).toBeTruthy();
    expect(window.location.search).toBe('');
  });

  it('posts 20 and refuses 19 without leaving the refused row', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /\$246\.00/ }, { timeout: 3000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Add credit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post credit' }));
    await screen.findByRole('button', { name: 'Add credit' }, { timeout: 3000 });
    expect(screen.getByText('$20.00')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add credit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), { target: { value: '19' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post credit' }));
    expect((await screen.findByRole('alert', {}, { timeout: 3000 })).textContent).toMatch(/ending in 9/);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getAllByText('Deposit')).toHaveLength(2);
    expect(screen.queryByText('$19.00')).toBeNull();
  });

  it('spins Glass Orchard once', async () => {
    render(<App />);
    await screen.findByText('100 titles', {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
    const spin = screen.getByRole('button', { name: 'Spin' });
    fireEvent.click(spin);
    fireEvent.click(spin);
    expect((screen.getByRole('button', { name: 'In play' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(
      () => {
        expect((screen.getByRole('button', { name: 'Spin' }) as HTMLButtonElement).disabled).toBe(false);
      },
      { timeout: 4000 },
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /\$24/ }));
    expect(screen.getAllByText('Stake')).toHaveLength(2);
  });

  it('pays a closed spin once and keeps the floor out of the dialog', async () => {
    render(<App />);
    await screen.findByText('100 titles', {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
    const cabinet = screen.getByRole('dialog', { name: 'Glass Orchard' });
    const backdrop = cabinet.parentElement;
    const floor = [...document.body.children].find((node) => node !== backdrop);
    expect((floor as HTMLElement).inert).toBe(true);

    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    random.mockRestore();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Glass Orchard' })).toBeNull();
    expect((floor as HTMLElement).inert).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Credit/ }));
    const wallet = screen.getByRole('dialog', { name: 'Wallet' });
    expect(within(wallet).getAllByText('Stake')).toHaveLength(2);
    expect(within(wallet).getAllByText('Win')).toHaveLength(2);
    expect(within(wallet).getAllByText('Glass Orchard')).toHaveLength(2);
    expect(within(wallet).getAllByText('$9.00')).toHaveLength(1);
  });

  it('pins two titles, reorders them, and jumps from the palette', async () => {
    render(<App />);
    await screen.findByText('100 titles', {}, { timeout: 3000 });

    const pins = screen.getAllByRole('button', { name: /^Pin / });
    fireEvent.click(pins[0]!);
    fireEvent.click(pins[1]!);
    const before = screen.getAllByRole('listitem').map((item) => item.textContent);
    fireEvent.keyDown(screen.getAllByRole('listitem')[0]!, { key: 'ArrowRight' });
    const after = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
    expect(JSON.parse(localStorage.getItem('merrin.favs') || '[]')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Card' })[0]!);
    expect(screen.getByText('Starts in the game client, not from this lobby.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Starts in the game client, not from this lobby.')).toBeNull();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const palette = screen.getByRole('dialog', { name: 'Command palette' });
    const box = within(palette).getByPlaceholderText('Title, studio, or command');
    fireEvent.change(box, { target: { value: 'gls' } });
    expect(within(palette).getAllByRole('option')[0]?.textContent).toMatch(/Glass/);
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull();
    expect(window.location.search.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Deutsch' }));
    expect(document.documentElement.lang).toBe('de');
  });
});
