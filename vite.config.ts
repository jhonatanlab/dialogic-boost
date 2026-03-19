import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const rootDir = path.resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(rootDir, "./src"),
      react: path.resolve(rootDir, "./node_modules/react"),
      "react-dom": path.resolve(rootDir, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(rootDir, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(rootDir, "./node_modules/react/jsx-dev-runtime.js"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
