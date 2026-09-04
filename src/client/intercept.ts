/**
 * The seam that makes this plugin work on an unmodified harness.
 *
 * Every file a conversation can open — tool rows, produced-file chips, unique
 * inline mentions — reaches the same place in stock DSH:
 * `workspaces.openPath(resolveWorkspacePath(cwd, path))`. Wrapping that one
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

/** The one method this package borrows from the harness. */
type OpenPath = (path: string) => Promise<void>

interface Workspaces {
  openPath: OpenPath
}

/**
 * Route previewable paths to `handled` and leave everything else alone.
 *
 * @param workspaces - the live `ctx.workspaces` service.
 * @param handled - returns true when this package took responsibility for the
 *   path; false hands the gesture back to the harness untouched.
 * @returns a disposer that restores the original method.
 */
export function interceptOpenPath(
  workspaces: Workspaces,
  handled: (resolvedPath: string) => boolean,
): () => void {
  const original = workspaces.openPath
  // A rename upstream must fail here, at mount, rather than silently degrade
  // into a plugin that renders nothing and swallows nothing.
  invariant(
    typeof original === 'function',
    'ctx.workspaces.openPath is not a function; this harness does not expose the file-open seam this plugin wraps',
  )

  const wrapped: OpenPath = async function (this: unknown, path: string): Promise<void> {
    if (handled(path)) return
    return Reflect.apply(original, this, [path]) as Promise<void>
  }

  workspaces.openPath = wrapped
  return () => {
    // Restore only what we installed: another plugin may have wrapped us in
    // turn, and clobbering its wrapper would silently disable it.
    if (workspaces.openPath === wrapped) workspaces.openPath = original
  }
}
