import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const apiTarget = process.env.BRIO_API_PROXY ?? 'http://localhost:4847';
// Public hostnames that may reach the dev/preview server (Cloudflare tunnel).
const allowedHosts = ['localhost', '127.0.0.1', 'briocartf.thegradlew.info'];

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative asset paths so the same build works from https://localhost inside Capacitor.
  base: mode === 'native' ? './' : '/',
  server: {
    port: Number(process.env.PORT ?? 5847),
    allowedHosts,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
  preview: {
    port: Number(process.env.PORT ?? 5848),
    allowedHosts,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: mode !== 'native',
    rolldownOptions: {
      output: {
        // Stable vendor chunks; form libraries (zod, react-hook-form) load only with form pages.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 20 },
            { name: 'forms', test: /node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
}));
