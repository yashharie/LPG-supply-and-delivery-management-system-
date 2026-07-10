import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Fallback to index.html for any path — required for client-side routing
    // (HashRouter doesn't need this, but it prevents 404s if the hash is lost)
    historyApiFallback: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
})
