import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  base: process.env.MYREST_BASE_PATH || '/',
});
