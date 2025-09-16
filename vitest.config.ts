import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isServer = mode === 'test:server';
  
  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: isServer ? 'node' : 'jsdom',
      setupFiles: isServer ? [] : ['./test/setup.ts'],
      include: [
        isServer 
          ? '**/server/tests/**/*.test.ts' 
          : 'client/src/**/*.test.{ts,tsx}'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/coverage/**',
          '**/test/**',
          '**/*.d.ts',
        ],
        all: true,
        include: [
          isServer 
            ? 'server/src/**/*.ts' 
            : 'client/src/**/*.{ts,tsx}'
        ],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './client/src'),
        '@server': resolve(__dirname, './server/src'),
      },
    },
  };
});
