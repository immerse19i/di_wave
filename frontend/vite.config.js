import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
        @import "@/assets/scss/variables.scss";
        @import "@/assets/scss/functions.scss";
        `
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 9099,
    proxy: {
      '/api': {
        target: 'http://localhost:9088',
        changeOrigin: true
      }
    }
  }
})
