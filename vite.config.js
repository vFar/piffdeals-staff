import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Default Supabase URL (fallback)
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://emqhyievrsyeinwrqqhw.supabase.co'
  
  return {
    plugins: [
      react({
        // Ensure React 19 compatibility
        jsxRuntime: 'automatic',
      }),
    ],
    // Ensure React is properly resolved (dedupe prevents multiple React instances)
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        // Ensure React is always resolved to the same instance
        'react': 'react',
        'react-dom': 'react-dom',
      },
    },
    // Define React version for Ant Design compatibility
    define: {
      'process.env': {},
      '__REACT_VERSION__': JSON.stringify('19.2.0'),
    },
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
      cssCodeSplit: true, // Enable CSS code splitting
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Combine React and Ant Design to avoid version check issues
            // Ant Design needs React to be available when it loads
            if (
              id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/antd') || 
              id.includes('node_modules/@ant-design')
            ) {
              return 'react-antd-vendor';
            }
            // Supabase vendor chunk
            if (id.includes('node_modules/@supabase')) {
              return 'supabase-vendor';
            }
            // MUI Charts chunk
            if (id.includes('node_modules/@mui')) {
              return 'mui-vendor';
            }
            // Chart libraries
            if (id.includes('node_modules/chart.js') || id.includes('node_modules/recharts')) {
              return 'charts-vendor';
            }
          },
          // Optimize chunk size
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Ensure proper module resolution for React 19
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      // Optimize dependencies
      optimizeDeps: {
        include: ['react', 'react-dom', 'antd'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
    },
  }
})
