import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Integration tests hit the real database, so they are deliberately kept out of
 * `pnpm check`. A gate that needs the network is a gate that fails for reasons
 * that have nothing to do with the change being checked.
 *
 *   pnpm test:db
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    // One connection, one property, shared rows — parallel files would collide.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
