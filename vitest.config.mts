import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Keep test imports aligned with the application's TypeScript path alias.
    alias: {
      // ImageKit 2.x publishes legacy `main`/`module` export conditions that
      // Next understands but Vite's Node resolver cannot select directly.
      "@imagekit/next/server": fileURLToPath(
        new URL("./node_modules/@imagekit/next/dist/server/index-esm.js", import.meta.url)
      ),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
