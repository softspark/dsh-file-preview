import { describe, expect, it } from 'vitest'
import { schemas, TYPERT_REMOTE } from '../src/remote.ts'
import type {
  FilePreview,
  FilePreviewFailure,
  FilePreviewRequest,
  FilePreviewResult,
} from '../src/types.ts'

/**
 * The wire schemas are hand-written, so nothing but this file stops them from
 * drifting away from the TypeScript types they are supposed to mirror. Every
 * value below is annotated with the real type: a type that stops matching fails
 * the typecheck, and a schema that stops matching fails the assertion.
 */
describe('remote descriptor', () => {
  it('describes exactly the one method the host exposes', () => {
    expect(TYPERT_REMOTE.descriptors).toHaveLength(1)
    const [only] = TYPERT_REMOTE.descriptors
    expect(only?.namespace).toBe('filePreview')
    expect(only?.method).toBe('previewFile')
    expect(only?.cancellation.parameter).toBe('signal')
  })

  it('accepts every request the client can build', () => {
    const request: FilePreviewRequest = { sessionId: 's-1', path: '/w/notes.md' }
    expect(schemas.request.parse(request)).toEqual(request)
  })

  it('accepts every preview payload the host can return', () => {
    const previews: FilePreview[] = [
      { kind: 'text', mimeType: 'text/markdown', content: '# hi', size: 4 },
      { kind: 'html', mimeType: 'text/html', content: '<p>hi</p>', size: 9 },
      { kind: 'svg', mimeType: 'image/svg+xml', content: '<svg/>', size: 6 },
      { kind: 'image', mimeType: 'image/png', contentBase64: 'AA==', size: 1 },
      { kind: 'pdf', mimeType: 'application/pdf', contentBase64: 'AA==', size: 1 },
    ]
    for (const preview of previews) expect(schemas.preview.parse(preview)).toEqual(preview)
  })

  it('accepts every failure in the closed vocabulary', () => {
    const failures: FilePreviewFailure[] = [
      { code: 'preview-not-found', path: '/w/a' },
      { code: 'preview-not-file', path: '/w/a' },
      { code: 'preview-outside-workspace', path: '/w/a' },
      { code: 'permission-denied', path: '/w/a' },
      { code: 'io-error', path: '/w/a' },
      { code: 'preview-unsupported', path: '/w/a' },
      { code: 'preview-unsupported', path: '/w/a', mimeType: 'application/zip' },
      { code: 'preview-too-large', path: '/w/a' },
      { code: 'preview-too-large', path: '/w/a', size: 99 },
    ]
    for (const failure of failures) expect(schemas.failure.parse(failure)).toEqual(failure)
  })

  it('round-trips both result branches', () => {
    const results: FilePreviewResult[] = [
      { ok: true, value: { kind: 'text', mimeType: 'text/plain', content: 'x', size: 1 } },
      { ok: false, error: { code: 'io-error', path: '/w/a' } },
    ]
    for (const result of results) expect(schemas.result.parse(result)).toEqual(result)
  })

  it('rejects a failure code outside the vocabulary', () => {
    // A new refusal reason must reach the client as a known code, never as an
    // unvalidated string that the modal would render as a blank error.
    expect(() => schemas.failure.parse({ code: 'made-up', path: '/w/a' })).toThrow()
  })

  it('rejects a preview that carries content on the binary branch', () => {
    expect(() => schemas.preview.parse({ kind: 'image', mimeType: 'image/png', content: 'x', size: 1 }))
      .toThrow()
  })
})
