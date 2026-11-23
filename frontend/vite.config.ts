import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
  },
  server: {
    port: 5173,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "../localhost+1-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "../localhost+1.pem")),
    },
  },
});
