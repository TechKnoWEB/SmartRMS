import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['lucide-react', 'react-hot-toast', 'recharts'],
          'vendor-excel':    ['exceljs'],
          'vendor-pdf':      ['html2pdf.js', 'html2canvas', 'jspdf'],
        },
      },
    },
  },
})
