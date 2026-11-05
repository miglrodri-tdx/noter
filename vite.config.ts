import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/noter/',
  server: {
    port: 5174
  },
  plugins: [react(), tailwindcss()],
})
