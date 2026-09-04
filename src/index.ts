/**
 * Host loader entry for the browser half of this plugin.
 *
 * DSH resolves a plugin row's name on the host first, even for a row whose
 * behaviour is entirely in the browser: it imports this module, then reads the
 * package's `dsh.client` declaration to decide what to serve the page. So the
 * row that carries the browser half must name the package root, and the root
 * must be Node-importable — pointing it straight at `lib/client.js` makes the
 * harness fail to boot with `window is not defined`.
 *
 * The host-side service lives at `./host` instead, and is registered by its own
 * row. Nothing belongs here: the browser half mounts its Remote namespace onto
 * `ctx.remote`, and that service exists only in the page.
 * @module @softspark/dsh-file-preview
 */

/** Host plugin body. The browser half owns all behaviour. */
export function apply(): void {}

export default apply
