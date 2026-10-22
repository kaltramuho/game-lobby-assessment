import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

function shellWorker() {
  return {
    name: 'merrin-shell-worker',
    apply: 'build' as const,
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url));
      const urls = new Set<string>(['/']);
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) {
            walk(full);
            continue;
          }
          const url = `/${relative(dist, full).replaceAll('\\', '/')}`;
          if (url !== '/sw.js') urls.add(url);
        }
      };
      walk(dist);
      const list = [...urls].sort();
      const swPath = join(dist, 'sw.js');
      const source = readFileSync(swPath, 'utf8');
      const next = source.replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = ${JSON.stringify(list)};`);
      if (next === source) throw new Error('service worker precache marker missing');
      writeFileSync(swPath, next);
    },
  };
}

export default defineConfig({
  plugins: [react(), shellWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
