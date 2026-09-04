import { defineConfig } from 'tsdown'

/**
 * Host build. The Remote descriptor is hand-written in `src/remote.ts` rather
 * than generated, because the harness generator only emits for packages that
 * sit below a workspace root and this is a single-package repository.
 */
export default defineConfig({
  entry: ['lib/types/index.js', 'lib/types/host.js', 'lib/types/invariant.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
