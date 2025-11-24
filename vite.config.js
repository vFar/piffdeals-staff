import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Default Supabase URL (fallback)
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://emqhyievrsyeinwrqqhw.supabase.co'
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy Supabase API requests to avoid CORS issues in development
        '/supabase-api': {
          target: supabaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/supabase-api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              const origin = req.headers.origin
              if (origin) {
                proxyRes.headers['access-control-allow-origin'] = origin
                proxyRes.headers['access-control-allow-credentials'] = 'true'
                proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
                proxyRes.headers['access-control-allow-headers'] = 'authorization, x-client-info, apikey, content-type, x-requested-with'
                proxyRes.headers['access-control-expose-headers'] = 'content-range'
              }
            })
          },
          ws: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Disable sourcemaps for production (smaller build)
      minify: 'esbuild', // Fast minification
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
