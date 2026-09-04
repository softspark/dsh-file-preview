/**
 * The host face of this package's Remote.
 *
 * The client face alone is not enough: the browser mounts `remote.filePreview`
 * from `./remote`, but the wire route only exists once the host registers this
 * descriptor. Without it every call answers `404 Not Found` and the modal shows
 * a load error while the host log stays silent.
 *
 * Both faces are built from the schemas in `./remote`, so the two cannot
 * describe different shapes.
 * @module @softspark/dsh-file-preview/typert
 */

import { INVOCATIONS } from './remote.ts'

/** Host-side Remote registration for the `filePreview` namespace. */
export const TYPERT = {
  package: '@softspark/dsh-file-preview',
  face: 'host',
  schemas: [],
  invocations: INVOCATIONS,
  model: { services: [], events: [], objects: [] },
} as const

export default TYPERT
