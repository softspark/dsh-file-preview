/**
 * Path helpers for the browser half.
 *
 * `node:path` is not available here and the only thing the modal needs is a
 * display name, so this stays deliberately small rather than pulling a
 * polyfill: both separators are accepted because the host may be Windows.
 * @module @softspark/dsh-file-preview/client/path
 */

/** The last segment of a path, or the whole string when it has no separator. */
export function basename(path: string): string {
  const trimmed = path.replace(/[/\\]+$/u, '')
  const index = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return index === -1 ? trimmed : trimmed.slice(index + 1)
}
