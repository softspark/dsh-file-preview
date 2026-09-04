import { describe, expect, it, vi } from 'vitest'
import type { FileOpenRequest } from '../src/types.ts'
import { createPreviewSource } from '../src/client/preview-source.ts'

const REQUEST: FileOpenRequest = {
  sessionId: 'session-1',
  path: 'notes.md',
  resolvedPath: '/tmp/verify-1170/notes.md',
}

describe('createPreviewSource', () => {
  it('publishes every open request and closes idempotently', () => {
    const source = createPreviewSource()
    const listener = vi.fn()
    const unsubscribe = source.subscribe(listener)

    expect(source.getSnapshot()).toBeNull()
    source.open(REQUEST)
    expect(source.getSnapshot()).toEqual(REQUEST)
    source.open(REQUEST)
    expect(listener).toHaveBeenCalledTimes(2)
    source.close()
    source.close()
    expect(source.getSnapshot()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    source.open(REQUEST)
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
