/**
 * Session-authorized file preview over the host filesystem seam.
 *
 * The whole surface is one Remote. A browser may read a file only when the
 * addressed session can already reach it: either the file sits inside that
 * session's workspace, or that session itself produced it through a successful
 * write or edit. Authorization is decided here from session facts, never from
 * anything the client sends, because a client-supplied allowlist would turn a
 * preview into an arbitrary host-file read.
 * @module @softspark/dsh-file-preview
 */

import type { Context } from '@deepseek-ai/cordis'
import { FsError } from '@deepseek-ai/dsh-fs'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-fs'
import { SessionId } from '@deepseek-ai/dsh-session'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
// The generated Remote artifacts import Zod at runtime.
import type {} from 'zod'
import { decodePreview, previewFormat } from './preview-content.ts'
import { successfulMutationPaths } from './preview-policy.ts'
import {
  previewRejected,
  previewSuccess,
  type FilePreviewFailure,
  type FilePreviewRequest,
  type FilePreviewResult,
} from './types.ts'

export type * from './types.ts'

/** `ctx.fs` options with `exactOptionalPropertyTypes` respected. */
function resolveOptions(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal === undefined ? {} : { signal }
}

/** Translate a filesystem failure into the closed preview vocabulary. */
function mapFsFailure(error: unknown, path: string): FilePreviewFailure {
  if (error instanceof FsError) {
    switch (error.code) {
      case 'FS_NOT_FOUND':
        return { code: 'preview-not-found', path }
      case 'FS_NOT_DIRECTORY':
      case 'FS_NOT_REGULAR_FILE':
        return { code: 'preview-not-file', path }
      case 'FS_TOO_LARGE':
        return { code: 'preview-too-large', path }
      case 'FS_PERMISSION_DENIED':
      case 'FS_SANDBOX_DENIED':
        return { code: 'permission-denied', path }
    }
  }
  return { code: 'io-error', path }
}

type AuthorizedTarget =
  | { readonly ok: true; readonly target: FsTarget }
  | { readonly ok: false; readonly error: FilePreviewFailure }

/**
 * Decide whether one session may see one path.
 *
 * Two independent grounds, both derived from the host's own view of the
 * session: containment in the session workspace, or provenance from a
 * successful mutation that session performed. A path that satisfies neither is
 * refused with the same code either way, so the refusal never reveals whether
 * the file exists.
 */
async function authorizeTarget(
  ctx: Context,
  input: FilePreviewRequest,
  signal: AbortSignal | undefined,
): Promise<AuthorizedTarget> {
  const outside: FilePreviewFailure = { code: 'preview-outside-workspace', path: input.path }
  const session = ctx.sessions.get(SessionId(input.sessionId))
  const cwd = session?.header.cwd
  if (session === undefined || cwd === undefined) return { ok: false, error: outside }

  const [target, workspace] = await Promise.all([
    ctx.fs.resolve(input.path, signal === undefined ? { cwd } : { cwd, signal }),
    ctx.fs.resolve(cwd, resolveOptions(signal)),
  ])
  if (ctx.fs.contains(workspace, target)) return { ok: true, target }

  for (const produced of successfulMutationPaths(session.events, cwd)) {
    try {
      const candidate = await ctx.fs.resolve(produced, resolveOptions(signal))
      // Mutual containment is path identity: a provenance entry grants exactly
      // the file it produced, never the directory that holds it.
      if (ctx.fs.contains(candidate, target) && ctx.fs.contains(target, candidate)) {
        return { ok: true, target }
      }
    } catch {
      // A stale or unreachable provenance path grants nothing.
    }
  }
  return { ok: false, error: outside }
}

/** Remote-only service exposing one session-authorized preview operation. */
export class FilePreviewGateway extends TypertRemoteService {
  static inject = ['fs', 'sessions']

  constructor(ctx: Context) {
    super(ctx, 'filePreview')
  }

  /**
   * Read one authorized file into a bounded, transport-safe payload.
   * @param input - the addressed session and the path as the conversation spelled it.
   * @param signal - caller lifetime; abort stops the read.
   * @returns the payload, or a failure that never carries file content.
   */
  @Remote('previewFile')
  async previewFile(input: FilePreviewRequest, signal?: AbortSignal): Promise<FilePreviewResult> {
    try {
      const authorized = await authorizeTarget(this.ctx, input, signal)
      if (!authorized.ok) return previewRejected(authorized.error)

      const info = await this.ctx.fs.stat(authorized.target, signal)
      if (info === undefined) return previewRejected({ code: 'preview-not-found', path: input.path })
      if (info.type !== 'file') return previewRejected({ code: 'preview-not-file', path: input.path })

      // Format is decided from the name before any byte is read, so an
      // unsupported file is refused without ever loading it.
      const format = previewFormat(input.path)
      if (format === undefined) return previewRejected({ code: 'preview-unsupported', path: input.path })
      if (info.size !== undefined && info.size > format.maxBytes) {
        return previewRejected({ code: 'preview-too-large', path: input.path, size: info.size })
      }

      const bytes = await this.ctx.fs.readBytes(authorized.target, signal, format.maxBytes)
      const preview = decodePreview(format, bytes)
      return preview === undefined
        ? previewRejected({ code: 'preview-unsupported', path: input.path, mimeType: format.mimeType })
        : previewSuccess(preview)
    } catch (error) {
      return previewRejected(mapFsFailure(error, input.path))
    }
  }
}

export default FilePreviewGateway
