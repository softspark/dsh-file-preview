import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { FileOpenRequest } from '../types.ts'

/** Observable request source shared by the conversation interception seam and the modal renderer. */
export interface ConversationPreviewSource extends HostObservable<FileOpenRequest | null> {
  /** Publish a new request, including repeated gestures for the same path. */
  open(request: FileOpenRequest): void
  /** Close the current preview. */
  close(): void
  /** Release subscribers when the plugin fiber is disposed. */
  dispose(): void
}

/** Create the single-preview controller owned by one plugin application. */
export function createPreviewSource(): ConversationPreviewSource {
  let snapshot: FileOpenRequest | null = null
  let disposed = false
  const listeners = new Set<() => void>()

  const publish = (next: FileOpenRequest | null): void => {
    if (disposed || (next === null && snapshot === null)) return
    // Clone requests so a repeated click still has a new snapshot identity.
    snapshot = next === null ? null : { ...next }
    for (const listener of [...listeners]) listener()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {}
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    open: (request) => { publish(request) },
    close: () => { publish(null) },
    dispose() {
      disposed = true
      snapshot = null
      listeners.clear()
    },
  }
}
