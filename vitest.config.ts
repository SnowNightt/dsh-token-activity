import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.spec.ts', 'packages/*/tests/**/*.spec.tsx'],
    environment: 'node',
    // Enables @testing-library/react's automatic afterEach(cleanup), which
    // otherwise leaves DOM from prior renders stacked across tests.
    globals: true,
  },
})
