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
        // Point this to your local backend server if you are running one separately
        // (e.g., using ts-node backend/server.ts), otherwise remove or comment out.
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
  */
})
