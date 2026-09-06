// @vitest-environment jsdom
import { createElement, useSyncExternalStore } from 'react'
import type { ComponentType } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.tsx'
import type { ConversationPreviewSource } from '../src/client/preview-source.ts'
import type { FileOpenRequest, FilePreviewResult } from '../src/types.ts'

interface Injected {
  hooks: { preview: ConversationPreviewSource }
  close: () => void
  previewFile: (request: FileOpenRequest, signal: AbortSignal) => Promise<FilePreviewResult>
}
interface OverlayProps extends Omit<Injected, 'hooks'> {
  usePreview: <T>(pick: (value: FileOpenRequest | null) => T) => T
  t: (key: string) => string
}

afterEach(cleanup)

describe('browser plugin registration on the DSH 0.1.2 Remote seam', () => {
  it('renders a claimed file, preserves native fallbacks, and restores the Remote on unload', async () => {
    let current: string | undefined = 'current'
    let injected: Injected | undefined
    let overlay: ComponentType<OverlayProps> | undefined
    const disposers: Array<() => void> = []
    const native = vi.fn(async () => ({ ok: true as const, value: { opened: true as const } }))
    const session = { get openWorkspacePath() { return native } }
    const original = Object.getOwnPropertyDescriptor(session, 'openWorkspacePath')
    const unmount = vi.fn(async () => {})
    const previewFile = vi.fn(async () => ({ ok: true as const, value: { ok: true as const, value: { kind: 'text' as const, mimeType: 'text/plain', content: 'preview marker', size: 14 } } }))
    const ctx = {
      remote: { $mount: vi.fn(async () => unmount), session },
      get: (name: string) => name === 'sessions' ? { list: { getSnapshot: () => ({ current }) } } : { previewFile },
      effect: (run: () => (() => void)) => { disposers.push(run()) },
      locale: { register: () => () => {} },
      slots: {
        inject: (_name: string, register: () => void) => register(),
        register: (options: { inject: () => Injected }, component: ComponentType<OverlayProps>) => {
          injected = options.inject()
          overlay = component
        },
      },
    } as unknown as Context
    const dispose = await apply(ctx)
    if (injected === undefined || overlay === undefined) throw new Error('overlay was not registered')
    const source = injected.hooks.preview
    const registered = injected
    const Component = overlay
    function Mounted() {
      return createElement(Component, {
        ...registered,
        usePreview: pick => pick(useSyncExternalStore(source.subscribe, source.getSnapshot)),
        t: key => key,
      })
    }
    render(<Mounted />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => { await ctx.remote.session.openWorkspacePath({ path: '/workspace/notes.txt' }) })
    expect((await screen.findByRole('dialog')).textContent).toContain('preview marker')
    expect(previewFile).toHaveBeenCalledWith({ sessionId: 'current', path: '/workspace/notes.txt' }, expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: 'preview.close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await ctx.remote.session.openWorkspacePath({ path: '/workspace/archive.zip' })
    current = undefined
    await ctx.remote.session.openWorkspacePath({ path: '/workspace/notes.txt' })
    expect(native).toHaveBeenCalledTimes(2)
    for (const cleanup of disposers) cleanup()
    await dispose()
    expect(Object.getOwnPropertyDescriptor(session, 'openWorkspacePath')).toEqual(original)
    expect(unmount).toHaveBeenCalledOnce()
    expect(source.getSnapshot()).toBeNull()
  })
})
