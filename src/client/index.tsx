/**
 * File-preview plugin, browser half.
 *
 * Claims conversation file-open gestures on an unmodified harness, renders the
 * one shared modal, and owns every policy decision: which paths it takes
 * responsibility for, which session authorizes the read, and what the user is
 * told when the host refuses. Composing this row out of a profile removes the
 * whole surface and restores the harness's native open.
 * @module @softspark/dsh-file-preview/client
 */

import type { ClientContext, ISessions } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the `ctx.remote` merge and the mounted namespace face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls `ctx.locale`.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls ui-layout's SlotMap merge, which declares `shell.overlay`.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import filePreviewRemote from '../remote.ts'
import { isPreviewablePath } from '../preview-content.ts'
import type { FileOpenRequest, FilePreviewResult } from '../types.ts'
import { FilePreviewModal } from './FilePreviewModal.tsx'
import { interceptOpenPath } from './intercept.ts'
import { en, NS, zh, type FilePreviewKey } from './locales.ts'
import { createPreviewSource } from './preview-source.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** File-preview modal copy. */
    'file-preview': FilePreviewKey
  }
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertClientRemote {
    /** This package's host Remote, mounted by `apply` below. */
    readonly filePreview: {
      previewFile(
        input: { readonly sessionId: string, readonly path: string },
        signal?: AbortSignal,
      ): Promise<{ ok: true, value: FilePreviewResult } | { ok: false }>
    }
  }
}

export type { FilePreviewKey } from './locales.ts'

/** Services the overlay registration, its dictionaries and its seam require. */
export const inject = ['slots', 'locale', 'sessions', 'workspaces', 'remote']

/**
 * Mount the Remote face, claim the file-open seam, and register the modal.
 * @param ctx - the browser plugin context.
 * @returns the disposer that unmounts the Remote face.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  // `remote.filePreview` exists only after this mount, so it cannot appear in
  // `inject` — an inject entry would wait for a service this apply creates.
  const disposeRemote = await ctx.remote.$mount(filePreviewRemote)
  const filePreview = ctx.get('remote.filePreview') as ClientRemote['filePreview']

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'file-preview: dictionaries')

  // `ctx.sessions` narrows to the render face; the current-selection feed lives
  // on the full contract, which is why it is read through `ctx.get`.
  const sessions = ctx.get('sessions') as unknown as ISessions

  const source = createPreviewSource()
  ctx.effect(() => () => { source.dispose() }, 'file-preview: request source')

  // The seam. Claim only what this package renders; everything else must reach
  // the harness's own opener exactly as it did before installation.
  ctx.effect(
    () => interceptOpenPath(ctx.workspaces, (resolvedPath) => {
      if (!isPreviewablePath(resolvedPath)) return false
      const sessionId = sessions.list.getSnapshot().current
      // Without a session there is nothing to authorize against, so the
      // gesture belongs to the harness rather than to a refusal dialog.
      if (sessionId === undefined) return false
      source.open({ sessionId: String(sessionId), resolvedPath, path: resolvedPath })
      return true
    }),
    'file-preview: openPath interception',
  )

  // `shell.overlay` is declared by ui-layout; the inject waits on that
  // declaration's lifetime and re-registers after a redeclaration.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'file-preview',
    order: 0,
    locale: NS,
    inject: () => ({
      request: source,
      close: () => { source.close() },
      // The Remote face double-envelopes results (carrier, then business), and
      // the modal only speaks the business one; a carrier failure becomes the
      // business io-error for the path that was addressed.
      previewFile: async (
        request: FileOpenRequest,
        signal: AbortSignal,
      ): Promise<FilePreviewResult> => {
        const result = await filePreview.previewFile(
          { sessionId: request.sessionId, path: request.resolvedPath },
          signal,
        )
        return result.ok
          ? result.value
          : { ok: false, error: { code: 'io-error', path: request.resolvedPath } }
      },
    }),
  }, FilePreviewOverlay))

  return async () => { await disposeRemote() }
}

/** Renders the single modal for whichever request the source currently holds. */
function FilePreviewOverlay(props: {
  readonly request: ReturnType<typeof createPreviewSource>
  readonly close: () => void
  readonly previewFile: (request: FileOpenRequest, signal: AbortSignal) => Promise<FilePreviewResult>
  readonly t: TranslateNS<typeof NS>
}) {
  const request = props.request.getSnapshot()
  if (request === null) return null
  return (
    <FilePreviewModal
      request={request}
      previewFile={props.previewFile}
      onClose={props.close}
      t={props.t}
    />
  )
}
