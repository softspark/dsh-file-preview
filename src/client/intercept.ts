/**
 * The seam that makes this plugin work on an unmodified harness.
 *
 * Every file a conversation can open, including tool rows and produced-file
 * chips, reaches `remote.session.openWorkspacePath({ path })` in DSH 0.1.2.
 * Wrapping that one
 * method therefore claims all three sources without patching, forking or
 * vendoring anything, and without depending on an extension point that only
 * exists in a modified harness.
 *
 * Cordis hands every fiber its own traceable proxy of a service, but a method
 * written through that proxy lands on the shared instance, so the wrapper is
 * visible to the conversation fiber that captured `ctx.workspaces` earlier.
 * That is verified behaviour of the vendored cordis, not an assumption.
 * @module @softspark/dsh-file-preview/client/intercept
 */

import { invariant } from '../invariant.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

/** The one method this package borrows from the harness. */
type OpenPath = (request: { readonly path: string }, signal?: AbortSignal) => Promise<RemoteResult<{ readonly opened: true }>>

interface WorkspaceOpener {
  openWorkspacePath: OpenPath
}

/**
 * Route previewable paths to `handled` and leave everything else alone.
 *
 * @param opener - the live `ctx.remote.session` namespace.
 * @param handled - returns true when this package took responsibility for the
 *   path; false hands the gesture back to the harness untouched.
 * @returns a disposer that restores the original method.
 */
export function interceptOpenPath(
  opener: WorkspaceOpener,
  handled: (resolvedPath: string) => boolean,
): () => void {
  const original = Object.getOwnPropertyDescriptor(opener, 'openWorkspacePath')
  const initial = opener.openWorkspacePath
  // A rename upstream must fail here, at mount, rather than silently degrade
  // into a plugin that renders nothing and swallows nothing.
  invariant(
    typeof initial === 'function' && original?.configurable !== false,
    'ctx.remote.session.openWorkspacePath is unavailable; this harness does not expose the file-open seam this plugin wraps',
  )

  // Remote methods are configurable getter-only descriptors. Resolve their
  // original getter for each caller so Cordis keeps the caller's trace context.
  const get = function (this: WorkspaceOpener): OpenPath {
    const native = original?.get?.call(this) as OpenPath | undefined ?? initial
    return async (request, signal) => {
      if (handled(request.path)) return { ok: true, value: { opened: true } }
      return Reflect.apply(native, this, [request, signal]) as ReturnType<OpenPath>
    }
  }

  Object.defineProperty(opener, 'openWorkspacePath', { configurable: true, enumerable: true, get })
  return () => {
    // Restore only what we installed: another plugin may have wrapped us in
    // turn, and clobbering its wrapper would silently disable it.
    if (Object.getOwnPropertyDescriptor(opener, 'openWorkspacePath')?.get !== get) return
    if (original === undefined) Reflect.deleteProperty(opener, 'openWorkspacePath')
    else Object.defineProperty(opener, 'openWorkspacePath', original)
  }
}
