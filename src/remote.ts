/**
 * The Remote face of this package's host service.
 *
 * The harness normally generates this from the compiled host types, but the
 * generator only emits for packages that sit *below* a workspace root, and this
 * is a single-package repository. Rather than reshape the repository around
 * someone else's build layout, the descriptor is written here — one method with
 * a closed result type is small enough to own.
 *
 * `tests/remote.spec.ts` is what keeps it honest: it drives representative
 * payloads through both these schemas and the TypeScript types, so a change to
 * one that is not mirrored in the other fails the suite instead of shipping.
 * @module @softspark/dsh-file-preview/remote
 */

import { z } from 'zod'

const request$schema = z.object({
  sessionId: z.string().readonly(),
  path: z.string().readonly(),
})

const preview$schema = z.union([
  z.object({
    kind: z.union([z.literal('text'), z.literal('html'), z.literal('svg')]).readonly(),
    mimeType: z.string().readonly(),
    content: z.string().readonly(),
    size: z.number().readonly(),
  }).readonly(),
  z.object({
    kind: z.union([z.literal('image'), z.literal('pdf')]).readonly(),
    mimeType: z.string().readonly(),
    contentBase64: z.string().readonly(),
    size: z.number().readonly(),
  }).readonly(),
])

const failure$schema = z.union([
  z.object({
    code: z.union([
      z.literal('preview-not-found'),
      z.literal('preview-not-file'),
      z.literal('preview-outside-workspace'),
      z.literal('permission-denied'),
      z.literal('io-error'),
    ]).readonly(),
    path: z.string().readonly(),
  }).readonly(),
  z.object({
    code: z.literal('preview-unsupported').readonly(),
    path: z.string().readonly(),
    mimeType: z.string().optional(),
  }).readonly(),
  z.object({
    code: z.literal('preview-too-large').readonly(),
    path: z.string().readonly(),
    size: z.number().optional(),
  }).readonly(),
])

const result$schema = z.union([
  z.object({ ok: z.literal(true).readonly(), value: preview$schema }).readonly(),
  z.object({ ok: z.literal(false).readonly(), error: failure$schema }).readonly(),
])

/** Wire schemas, exported so the drift test can reach them by name. */
export const schemas = {
  request: request$schema,
  preview: preview$schema,
  failure: failure$schema,
  result: result$schema,
} as const

const PACKAGE = '@softspark/dsh-file-preview'

/**
 * The one invocation this package exposes, shared by both faces.
 *
 * The host registers it as `invocations`, the browser mounts it as
 * `descriptors`; keeping one array means the wire contract cannot disagree
 * with itself across the two.
 */
export const INVOCATIONS = [
  {
    id: `${PACKAGE}#filePreview/previewFile`,
    service: 'filePreview',
    namespace: 'filePreview',
    method: 'previewFile',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'input',
        wire: 'input',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: `${PACKAGE}/types#FilePreviewRequest`,
          schema: request$schema,
        },
      },
    ],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: `${PACKAGE}/types#FilePreviewResult`,
      schema: result$schema,
    },
  },
] as const

/** The descriptor the browser half mounts onto `ctx.remote`. */
export const TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors: INVOCATIONS,
} as const

export default TYPERT_REMOTE
