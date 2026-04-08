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
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Court Night",
        short_name: "Court Night",
        description: "NBA Playoff Predictions",
        theme_color: "#C9B037",
        background_color: "#080500",
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
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
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
