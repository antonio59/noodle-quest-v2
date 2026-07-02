import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    // Playwright owns e2e/ — keep vitest out of it
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // convex-test ships TS that must be transformed by Vite
    server: { deps: { inline: ['convex-test'] } },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**', 'convex/**'],
      exclude: ['convex/_generated/**', 'src/test-setup.ts', 'src/assets/**'],
    },
  },
})
