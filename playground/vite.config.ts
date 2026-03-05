import { defineConfig } from 'vite'
import boostkit from '@boostkit/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(async () => ({
  plugins: [
    ...(await boostkit({ ui: ['react', 'vue', 'solid'] })),
    tailwindcss(),
  ],
}))
