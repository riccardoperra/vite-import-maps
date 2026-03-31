import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "vite-import-maps-integration",
    dir: "./test",
    environment: "node",
  },
});
