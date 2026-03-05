import { defineConfig } from 'vite'
import boostkit from '@boostkit/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    boostkit({ ui: ['react', 'vue', 'solid'] }),
    tailwindcss(),
  ],
})
