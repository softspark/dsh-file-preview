/**
 * The preview contract shared by the host Remote and the browser modal.
 *
 * Every shape here is closed on purpose. A failure never carries file bytes,
 * and an unsupported format is reported as a code rather than as a partial
 * read, so a refusal can never become an accidental disclosure channel.
 * @module @softspark/dsh-file-preview/types
 */

/** What the browser is allowed to render, and how it must treat the payload. */
export type FilePreviewKind = 'text' | 'html' | 'svg' | 'image' | 'pdf'

/**
 * A complete, bounded preview payload.
 *
 * `html` and `svg` stay separate from `text` because the client sanitises them
 * differently; collapsing them would lose the only signal that says "this
 * document can carry active content".
 */
export type FilePreview =
  | {
    readonly kind: 'text' | 'html' | 'svg'
    readonly mimeType: string
    readonly content: string
    readonly size: number
  }
  | {
    readonly kind: 'image' | 'pdf'
    readonly mimeType: string
    readonly contentBase64: string
    readonly size: number
  }

/** The closed failure vocabulary of a preview request. */
export type FilePreviewFailure =
  | { readonly code: 'preview-not-found' | 'preview-not-file' | 'preview-outside-workspace'; readonly path: string }
  | { readonly code: 'preview-unsupported'; readonly path: string; readonly mimeType?: string }
  | { readonly code: 'preview-too-large'; readonly path: string; readonly size?: number }
  | { readonly code: 'permission-denied' | 'io-error'; readonly path: string }

/** One preview request, always addressed to the session that may see the file. */
export interface FilePreviewRequest {
  /** The DSH session whose workspace and mutation history authorize this read. */
  readonly sessionId: string
  /** The path as the conversation spelled it; resolution happens on the host. */
  readonly path: string
}

/** A settled preview request. Rejections never carry content. */
export type FilePreviewResult =
  | { readonly ok: true; readonly value: FilePreview }
  | { readonly ok: false; readonly error: FilePreviewFailure }

/** Wrap a successful payload. */
export function previewSuccess(value: FilePreview): FilePreviewResult {
  return { ok: true, value }
}

/** Wrap a refusal. */
export function previewRejected(error: FilePreviewFailure): FilePreviewResult {
  return { ok: false, error }
}

/**
 * One file-open gesture observed on the client.
 *
 * The stock harness hands the opener a single resolved path, so `sessionId` is
 * supplied by this package from the conversation the gesture came from — it is
 * what the host authorizes against, and a request without it can only be
 * refused.
 */
export interface FileOpenRequest {
  /** The session whose workspace and history authorize the read. */
  readonly sessionId: string
  /** The path the harness resolved and would otherwise have opened natively. */
  readonly resolvedPath: string
  /**
   * The spelling shown to the user.
   *
   * The stock seam hands over a resolved absolute path and nothing else, so
   * this is the same string unless a caller knows the original relative form.
   */
  readonly path: string
}
