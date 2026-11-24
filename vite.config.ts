import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localApi } from './scripts/vite-local-api';

// https://vite.dev/config/
export default defineConfig({
  // localApi() serves the Vercel functions in /api during `dev` and `preview` only.
  plugins: [react(), localApi()],
  server: {
    port: 3000,
    open: false,
  },
});
