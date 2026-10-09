import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    // `npm run dev` against the Docker stack: send the API calls to the nginx edge (port 5173 of the frontend container)
    proxy: { "/api": process.env.VITE_DEV_API ?? "http://localhost:5173" },
  },
});
