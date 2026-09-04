import { describe, expect, it } from 'vitest'
import {
  BINARY_PREVIEW_BYTES, TEXT_PREVIEW_BYTES, decodePreview, previewFormat,
} from '../src/preview-content.ts'

describe('preview content policy', () => {
  it('classifies supported static formats with bounded caps', () => {
    expect(previewFormat('README.md')).toMatchObject({ kind: 'text', mimeType: 'text/markdown', maxBytes: TEXT_PREVIEW_BYTES })
    expect(previewFormat('diagram.svg')).toMatchObject({ kind: 'svg', mimeType: 'image/svg+xml' })
    expect(previewFormat('photo.PNG')).toMatchObject({ kind: 'image', mimeType: 'image/png', maxBytes: BINARY_PREVIEW_BYTES })
    expect(previewFormat('archive.zip')).toBeUndefined()
  })

  it('decodes UTF-8 as inert text and rejects invalid UTF-8', () => {
    const html = previewFormat('unsafe.html')
    expect(html && decodePreview(html, new TextEncoder().encode('<script>alert(1)</script>'))).toEqual({
      kind: 'html',
      mimeType: 'text/html',
      content: '<script>alert(1)</script>',
      size: 25,
    })
    expect(html && decodePreview(html, Uint8Array.from([0xff, 0xfe]))).toBeUndefined()
  })

  it('validates binary signatures before base64 transport', () => {
    const png = previewFormat('image.png')
    const valid = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
    expect(png && decodePreview(png, valid)).toMatchObject({
      kind: 'image',
      mimeType: 'image/png',
      contentBase64: Buffer.from(valid).toString('base64'),
    })
    expect(png && decodePreview(png, new TextEncoder().encode('<svg/>'))).toBeUndefined()
  })
})
