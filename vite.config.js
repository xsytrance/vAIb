import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // In production/Android builds, VITE_API_BASE points directly to the API server.
  // In dev, the Vite proxy handles /api/backend/* → localhost:4014.
  define: {
    // Safe default for APK/file:// context. Override per-environment via VITE_API_BASE.
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || 'http://100.110.224.126:4014'),
  },
  build: {
    // Prevent brittle minified init-order regressions on Android WebView.
    minify: false,
    sourcemap: true,
    target: 'es2020',
  },
  server: {
    host: '0.0.0.0',
    port: 4013,
    proxy: {
      '/api/backend': {
        target: 'http://127.0.0.1:4014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, ''),
      },
    },
  },
})
