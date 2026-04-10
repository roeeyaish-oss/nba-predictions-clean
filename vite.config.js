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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router-dom/")
          ) {
            return "vendor-react";
          }

          if (id.includes("/@supabase/supabase-js/")) {
            return "vendor-supabase";
          }

          if (id.includes("/lucide-react/")) {
            return "vendor-ui";
          }

          if (
            id.includes("/recharts/") ||
            id.includes("/chart.js/") ||
            id.includes("/victory/") ||
            id.includes("/d3-")
          ) {
            return "vendor-charts";
          }
        },
      },
    },
  },
})
