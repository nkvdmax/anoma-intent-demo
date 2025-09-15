﻿import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/anoma-intent-demo/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false }
});
