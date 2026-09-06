import { describe, expect, it, vi } from 'vitest'
import { interceptOpenPath } from '../src/client/intercept.ts'

function namespace() {
  const native = vi.fn(async (_request: { readonly path: string }, _signal?: AbortSignal) => ({
    ok: true as const, value: { opened: true as const },
  }))
  const getter = vi.fn(() => native)
  const opener = { get openWorkspacePath() { return getter() } }
  return { opener, native, getter }
}

describe('interceptOpenPath', () => {
  it('claims a preview without invoking the host opener', async () => {
    const { opener, native } = namespace()
    const handled = vi.fn(() => true)
    interceptOpenPath(opener, handled)
    expect(await opener.openWorkspacePath({ path: '/w/notes.md' }))
      .toEqual({ ok: true, value: { opened: true } })
    expect(handled).toHaveBeenCalledWith('/w/notes.md')
    expect(native).not.toHaveBeenCalled()
  })

  it('preserves the native request, cancellation and carrier result for other paths', async () => {
    const { opener, native, getter } = namespace()
    const request = { path: '/w/archive.zip' }
    const signal = new AbortController().signal
    interceptOpenPath(opener, () => false)
    await opener.openWorkspacePath(request, signal)
    expect(native).toHaveBeenCalledWith(request, signal)
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('restores the getter-only Remote descriptor on unload', () => {
    const { opener } = namespace()
    const before = Object.getOwnPropertyDescriptor(opener, 'openWorkspacePath')
    const dispose = interceptOpenPath(opener, () => true)
    dispose()
    expect(Object.getOwnPropertyDescriptor(opener, 'openWorkspacePath')).toEqual(before)
  })

  it('does not overwrite a later wrapper during out-of-order unload', () => {
    const { opener } = namespace()
    const dispose = interceptOpenPath(opener, () => true)
    const outer = () => vi.fn()
    Object.defineProperty(opener, 'openWorkspacePath', { configurable: true, get: outer })
    dispose()
    expect(Object.getOwnPropertyDescriptor(opener, 'openWorkspacePath')?.get).toBe(outer)
  })

  it('rejects a missing or nonconfigurable opener at mount time', () => {
    const missing = { openWorkspacePath: undefined } as unknown as ReturnType<typeof namespace>['opener']
    expect(() => interceptOpenPath(missing, () => true)).toThrow(/file-open seam/u)
    const { opener } = namespace()
    Object.defineProperty(opener, 'openWorkspacePath', { configurable: false })
    expect(() => interceptOpenPath(opener, () => true)).toThrow(/file-open seam/u)
  })
})
