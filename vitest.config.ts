import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: loadEnv('test', process.cwd(), ''),
    maxWorkers: 1,
  },
});
