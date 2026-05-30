import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, UserConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA, VitePWAOptions } from "vite-plugin-pwa";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUT_DIRECTORY = "dist";

const pwaConfig: Partial<VitePWAOptions> = {
  injectRegister: "script",
  registerType: "autoUpdate",
  devOptions: {
    enabled: false,
  },
  manifest: {
    icons: [
      { src: "pwa/icon-64x64.png",   sizes: "64x64",   type: "image/png" },
      { src: "pwa/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    name: "Long Term Hire",
    short_name: "Long Term Hire",
    display: "standalone",
    background_color: "#292A2B",
    description: "Long Term Hire",
    theme_color: "#FDCE06",
    start_url: "/",
  },
};

const config: UserConfig = {
  plugins: [
    react(),
    VitePWA(pwaConfig),
  ],
  assetsInclude: [
    "**/*.svg",
    "**/*.png",
    "**/*.jpg",
    "**/*.jpeg",
    "**/*.gif",
    "**/*.ico",
    "**/*.woff",
    "**/*.woff2",
    "**/*.ttf",
    "**/*.eot",
  ],
  build: {
    outDir: OUTPUT_DIRECTORY,
    sourcemap: false,
    // Raise chunk size warning limit — this app has heavy deps (@react-pdf etc.)
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: ["fsevents", "@tailwindcss/oxide"],
      output: {
        manualChunks: {
          // Core React
          vendor: ["react", "react-dom", "react-router-dom", "react-router"],
          // PDF generation (large, isolated)
          pdf: ["@react-pdf/renderer"],
          // UI utilities
          ui: ["react-toastify", "react-spinners", "lucide-react", "framer-motion"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@/components": path.resolve(dirname, "./src/components"),
      "@/pages":      path.resolve(dirname, "./src/pages"),
      "@/utils":      path.resolve(dirname, "./src/utils"),
      "@/assets":     path.resolve(dirname, "./src/assets"),
      "@/context":    path.resolve(dirname, "./src/context"),
      "@/routes":     path.resolve(dirname, "./src/routes"),
      "@/query":      path.resolve(dirname, "./src/query"),
      "@/hooks":      path.resolve(dirname, "./src/hooks"),
      "@":            path.resolve(dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.PORT || "3001"),
  },
};

export default defineConfig(config);
