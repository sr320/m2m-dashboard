import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Deploying to https://sr320.github.io/m2m-dashboard/
export default defineConfig({
  plugins: [react()],
  base: '/m2m-dashboard/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})
