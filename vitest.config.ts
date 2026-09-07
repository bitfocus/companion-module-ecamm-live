import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup.ts'],
		// Explicit imports from 'vitest' rather than globals, matching the strict ESM style used
		// throughout this module.
		globals: false,
		restoreMocks: true,
		clearMocks: true,
		// Restores the real fetch between tests, so a stub can never leak into the next one.
		unstubGlobals: true,
		coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/main.ts'] },
	},
})
