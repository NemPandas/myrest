import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin/',
  resolve: { dedupe: ['react', 'react-dom'] },
  define: {
    'import.meta.env.VITE_STOREFRONT_BASE': JSON.stringify(process.env.VITE_STOREFRONT_BASE || '/'),
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: ['..'] },
    proxy: { '/api': { target: process.env.MYREST_API_TARGET || 'http://localhost:3001' } },
  },
});
