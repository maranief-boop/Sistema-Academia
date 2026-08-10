import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite — base relativa permite hospedar o PWA em qualquer subpasta.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    open: true,
    port: 5173
  }
})