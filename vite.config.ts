import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "SmartMetrix",
        short_name: "SmartMetrix",
        description:
          "Smart NAWI Inspection, Compliance and Certification System",
        theme_color: "#0f172a",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait-primary",
      },

      workbox: {
        cleanupOutdatedCaches: true,

       runtimeCaching: [
  {
    urlPattern: /^https:\/\/smartmetrix-backend-mf17\.onrender\.com\/api\/.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "smartmetrix-api-cache",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24,
      },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
});