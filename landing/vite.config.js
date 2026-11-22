import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': { target: env.MYREST_API_TARGET || 'http://localhost:3001', changeOrigin: true } };
  return {
    base: env.MYREST_BASE_PATH || '/',
    resolve: { dedupe: ['react', 'react-dom'] },
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: { proxy },
  };
});
