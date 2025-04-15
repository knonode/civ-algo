import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // The server.proxy configuration is typically not needed when using `vercel dev`,
  // as `vercel dev` handles routing to the /api functions automatically.
  /*
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // This part should be removed or commented out
        changeOrigin: true,
        secure: false,
      }
    }
  }
  */
  build: {
    outDir: 'dist'
  }
})
