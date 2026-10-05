import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root('./'),
      // `server-only` throws when imported outside a Next server build.
      // Tests run in plain Node, so swap in a no-op.
      'server-only': root('./test/server-only-stub.ts'),
    },
  },
  test: { include: ['lib/**/*.test.ts'] },
});
