import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.MYREST_BASE_PATH || '/',
});
