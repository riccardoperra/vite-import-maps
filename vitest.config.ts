import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "vite-import-maps",
    dir: "./test",
    environment: "node",
  },
  plugins: [],
});
