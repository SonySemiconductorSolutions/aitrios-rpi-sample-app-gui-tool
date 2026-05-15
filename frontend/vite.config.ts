import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/ui",
  envDir: "..",
  plugins: [react()],
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        entryFileNames: "static/js/[name]-[hash].js",
        chunkFileNames: "static/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "asset";
          return /\.css$/i.test(name)
            ? "static/css/[name]-[hash][extname]"
            : "static/media/[name]-[hash][extname]";
        },
      },
    },
  },
  envPrefix: "REACT_APP_",
});
