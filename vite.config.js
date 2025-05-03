import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import Unocss from "unocss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    Unocss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "NBA Playoff Predictions",
        short_name: "NBA Predictions",
        description: "Predict NBA playoff games and compete with friends!",
        theme_color: "#0b0f2a",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        id: "/",
        screenshots: [
          {
            src: "/screenshots/homepage.png",
            sizes: "1080x1920",
            type: "image/png",
            form_factor: "narrow",
          },
          {
            src: "/screenshots/homepage.png",
            sizes: "1080x1920",
            type: "image/png",
            form_factor: "wide",
          },
        ],
        icons: [
          {
            src: "/logo-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          
        ],
      },
    }),
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
