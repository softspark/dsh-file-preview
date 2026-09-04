// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileOpenRequest } from '../src/types.ts'
import type { FilePreviewResult } from '../src/types.ts'
import {
  FilePreviewModal,
  type FilePreviewModalProps,
  sanitizeHtmlDocument,
  sanitizeSvgDocument,
} from '../src/client/FilePreviewModal.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en) => en[key]) as FilePreviewModalProps['t']

const REQUEST: FileOpenRequest = {
  sessionId: 'session-1',
  path: 'notes.md',
  resolvedPath: '/tmp/verify-1170/notes.md',
}

const success = (value: {
  kind: 'text' | 'html' | 'svg' | 'image' | 'pdf'
  mimeType: string
  content?: string
  contentBase64?: string
  size: number
}): FilePreviewResult => ({ ok: true, value } as FilePreviewResult)

afterEach(cleanup)

describe('FilePreviewModal', () => {
  it('loads Markdown in one dialog and returns focus after Escape', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'open preview'
    document.body.append(opener)
    opener.focus()
    const onClose = vi.fn()
    const previewFile = vi.fn(async () => success({
      kind: 'text', mimeType: 'text/markdown', content: '# Pears', size: 7,
    }))

    const view = render(
      <FilePreviewModal
        request={REQUEST}
        previewFile={previewFile}
        onClose={onClose}
        t={t}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'notes.md' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(en['preview.loading'])
    expect(await screen.findByRole('heading', { name: 'Pears' })).toBeTruthy()
    expect(previewFile).toHaveBeenCalledWith(REQUEST, expect.any(AbortSignal))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('aborts an outstanding request when the dialog unmounts', () => {
    let signal: AbortSignal | undefined
    const previewFile = vi.fn((_request: FileOpenRequest, nextSignal: AbortSignal) => {
      signal = nextSignal
      return new Promise<FilePreviewResult>(() => {})
    })
    const view = render(
      <FilePreviewModal request={REQUEST} previewFile={previewFile} onClose={() => {}} t={t} />,
    )
    expect(signal?.aborted).toBe(false)
    view.unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('renders a recoverable business error and retries', async () => {
    const previewFile = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { code: 'preview-not-found', path: REQUEST.resolvedPath } })
      .mockResolvedValueOnce(success({ kind: 'text', mimeType: 'text/plain', content: 'ready', size: 5 }))
    render(
      <FilePreviewModal request={REQUEST} previewFile={previewFile} onClose={() => {}} t={t} />,
    )

    expect(await screen.findByText(en['preview.notFound'])).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['preview.retry'] }))
    expect(await screen.findByText('ready')).toBeTruthy()
    expect(previewFile).toHaveBeenCalledTimes(2)
  })

  it('never commits the previous payload under a new request identity', async () => {
    const committedText: string[] = []
    const signals: AbortSignal[] = []
    let resolveSecond: ((result: FilePreviewResult) => void) | undefined
    const previewFile = vi.fn((_request: FileOpenRequest, signal: AbortSignal) => {
      signals.push(signal)
      if (signals.length === 1) {
        return Promise.resolve(success({ kind: 'text', mimeType: 'text/plain', content: 'first payload', size: 13 }))
      }
      return new Promise<FilePreviewResult>((resolve) => { resolveSecond = resolve })
    })
    const onRender = (): void => { committedText.push(document.body.textContent ?? '') }
    const view = render(
      <Profiler id="preview" onRender={onRender}>
        <FilePreviewModal request={REQUEST} previewFile={previewFile} onClose={() => {}} t={t} />
      </Profiler>,
    )
    expect(await screen.findByText('first payload')).toBeTruthy()
    committedText.length = 0

    const nextRequest = { ...REQUEST, path: 'second.txt', resolvedPath: '/tmp/second.txt' }
    view.rerender(
      <Profiler id="preview" onRender={onRender}>
        <FilePreviewModal request={nextRequest} previewFile={previewFile} onClose={() => {}} t={t} />
      </Profiler>,
    )

    expect(signals[0]?.aborted).toBe(true)
    expect(screen.queryByText('first payload')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(committedText.some(text => text.includes('second.txt') && text.includes('first payload'))).toBe(false)

    resolveSecond?.(success({ kind: 'text', mimeType: 'text/plain', content: 'second payload', size: 14 }))
    expect(await screen.findByText('second payload')).toBeTruthy()
  })

  it('renders bounded raster images and PDF documents in-page', async () => {
    const { rerender } = render(
      <FilePreviewModal
        request={REQUEST}
        previewFile={async () => success({ kind: 'image', mimeType: 'image/png', contentBase64: 'iVBORw0KGgo=', size: 8 })}
        onClose={() => {}}
        t={t}
      />,
    )
    const image = await screen.findByRole('img', { name: 'notes.md' })
    expect(image.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=')

    rerender(
      <FilePreviewModal
        request={{ ...REQUEST, path: 'report.pdf', resolvedPath: '/tmp/report.pdf' }}
        previewFile={async () => success({ kind: 'pdf', mimeType: 'application/pdf', contentBase64: 'JVBERi0=', size: 5 })}
        onClose={() => {}}
        t={t}
      />,
    )
    const frame = await screen.findByTitle('report.pdf')
    expect(frame.getAttribute('src')).toBe('data:application/pdf;base64,JVBERi0=')
    expect(frame.getAttribute('sandbox')).toBe('')

    const close = screen.getByRole('button', { name: en['preview.close'] })
    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(frame)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
  })

  it('sanitizes active HTML and SVG content before rendering it', async () => {
    const html = sanitizeHtmlDocument('<h1>Safe</h1><script>attack()</script><a href="https://example.com">go</a><custom-box><script>nestedAttack()</script><strong title="removed">kept</strong></custom-box><img src="https://example.com/x">')
    expect(html).toContain('<h1>Safe</h1>')
    expect(html).toContain('<strong>kept</strong>')
    expect(html).not.toMatch(/script|href|img|example\.com/i)

    const svg = sanitizeSvgDocument('<svg viewBox="0 0 10 10" onload="attack()"><script>attack()</script><path d="M0 0" fill="url(https://example.com/x)"/><circle cx="1" cy="1" r="1"/></svg>')
    expect(svg).toContain('<circle cx="1" cy="1" r="1"')
    expect(svg).not.toMatch(/script|onload|url\(|example\.com/i)

    render(
      <FilePreviewModal
        request={{ ...REQUEST, path: 'safe.html', resolvedPath: '/tmp/safe.html' }}
        previewFile={async () => success({ kind: 'html', mimeType: 'text/html', content: '<h1>Safe</h1><script>attack()</script>', size: 30 })}
        onClose={() => {}}
        t={t}
      />,
    )
    await waitFor(() => { expect(screen.getByRole('heading', { name: 'Safe' })).toBeTruthy() })
    expect(document.querySelector('script')).toBeNull()
  })
})
