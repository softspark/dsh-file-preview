import { defineConfig } from 'vitest/config'
import ts from 'typescript'

export default defineConfig({
  // The published harness packages ship `//# sourceMappingURL` comments without
  // the maps themselves; reading them is both impossible and pointless here.
  css: { devSourcemap: false },
  oxc: { jsx: { runtime: 'automatic' } },
  // Match the production TypeScript build for the host's standard Remote
  // decorator; Vite's OXC transform currently preserves that decorator.
  plugins: [{
    name: 'host-standard-decorators',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/src/host.ts')) return
      const result = ts.transpileModule(source, {
        fileName: id,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, sourceMap: true, inlineSources: true },
      })
      return { code: result.outputText, map: result.sourceMapText }
    },
  }],
  test: {
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
    },
    environmentMatchGlobs: [['tests/**/*.client.spec.{ts,tsx}', 'jsdom']],
    // The modal and the harness primitives it borrows both ship CSS modules.
    // Node cannot import `.css`, so these dependencies are transformed by Vite
    // instead of being externalized.
    server: { deps: { inline: [/@deepseek-ai\//u] } },
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
