import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Expose to all network interfaces
    port: 5173,
    strictPort: true, // If port is taken, don't try another
    https: process.env.HTTPS === 'true' ? {
      key: fs.readFileSync(path.join(__dirname, '.cert', 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '.cert', 'cert.pem')),
    } : false,
    watch: {
      usePolling: true,
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
    'process.version': '"v16.0.0"'
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
