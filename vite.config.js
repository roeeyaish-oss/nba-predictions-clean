import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import Unocss from 'unocss/vite'

export default defineConfig({
  plugins: [
    react(),
    Unocss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api/dailyPredictions": {
        target:
          "https://script.google.com/macros/s/AKfycbzkm85dkp1X4FCboHYczkZ9l3oZkEAw1cZVpLD0fEQWQTVkPxtaKHRno1lfW-XY5e7Z/exec",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dailyPredictions/, "?action=dailyPredictions"),
      },
    },
  },
})
