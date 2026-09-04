import type { FilePreview } from './types.ts'

/**
 * The extension of a path, lowercased, including the dot.
 *
 * Inlined rather than imported from `node:path` so this whole module stays
 * isomorphic: the browser half needs the same table to decide whether to
 * intercept a file-open gesture at all.
 */
function extname(path: string): string {
  const name = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot)
}

/** Maximum complete UTF-8 document size returned to the browser. */
export const TEXT_PREVIEW_BYTES = 1024 * 1024
/** Maximum complete raster/PDF size returned to the browser. */
export const BINARY_PREVIEW_BYTES = 8 * 1024 * 1024

interface PreviewFormat {
  readonly kind: FilePreview['kind']
  readonly mimeType: string
  readonly maxBytes: number
  readonly signature?: (bytes: Uint8Array) => boolean
}

const text = (mimeType = 'text/plain'): PreviewFormat => ({
  kind: 'text',
  mimeType,
  maxBytes: TEXT_PREVIEW_BYTES,
})

const startsWith = (prefix: readonly number[]) => (bytes: Uint8Array): boolean =>
  prefix.every((value, index) => bytes[index] === value)

const FORMATS: Readonly<Record<string, PreviewFormat>> = {
  '.txt': text(),
  '.md': text('text/markdown'),
  '.markdown': text('text/markdown'),
  '.json': text('application/json'),
  '.jsonl': text('application/x-ndjson'),
  '.yaml': text('application/yaml'),
  '.yml': text('application/yaml'),
  '.toml': text('application/toml'),
  '.xml': text('application/xml'),
  '.csv': text('text/csv'),
  '.ts': text('text/typescript'),
  '.tsx': text('text/typescript'),
  '.js': text('text/javascript'),
  '.jsx': text('text/javascript'),
  '.mjs': text('text/javascript'),
  '.cjs': text('text/javascript'),
  '.css': text('text/css'),
  '.scss': text('text/x-scss'),
  '.less': text('text/x-less'),
  '.py': text('text/x-python'),
  '.go': text('text/x-go'),
  '.rs': text('text/x-rust'),
  '.java': text('text/x-java-source'),
  '.kt': text('text/x-kotlin'),
  '.kts': text('text/x-kotlin'),
  '.swift': text('text/x-swift'),
  '.rb': text('text/x-ruby'),
  '.php': text('text/x-php'),
  '.sh': text('text/x-shellscript'),
  '.bash': text('text/x-shellscript'),
  '.zsh': text('text/x-shellscript'),
  '.fish': text('text/x-shellscript'),
  '.sql': text('application/sql'),
  '.graphql': text('application/graphql'),
  '.gql': text('application/graphql'),
  '.ini': text(),
  '.conf': text(),
  '.env': text(),
  '.log': text(),
  '.diff': text('text/x-diff'),
  '.patch': text('text/x-diff'),
  '.html': { kind: 'html', mimeType: 'text/html', maxBytes: TEXT_PREVIEW_BYTES },
  '.htm': { kind: 'html', mimeType: 'text/html', maxBytes: TEXT_PREVIEW_BYTES },
  '.svg': { kind: 'svg', mimeType: 'image/svg+xml', maxBytes: TEXT_PREVIEW_BYTES },
  '.png': { kind: 'image', mimeType: 'image/png', maxBytes: BINARY_PREVIEW_BYTES, signature: startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  '.jpg': { kind: 'image', mimeType: 'image/jpeg', maxBytes: BINARY_PREVIEW_BYTES, signature: startsWith([0xff, 0xd8, 0xff]) },
  '.jpeg': { kind: 'image', mimeType: 'image/jpeg', maxBytes: BINARY_PREVIEW_BYTES, signature: startsWith([0xff, 0xd8, 0xff]) },
  '.gif': { kind: 'image', mimeType: 'image/gif', maxBytes: BINARY_PREVIEW_BYTES, signature: bytes => new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' || new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a' },
  '.webp': { kind: 'image', mimeType: 'image/webp', maxBytes: BINARY_PREVIEW_BYTES, signature: bytes => new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP' },
  '.pdf': { kind: 'pdf', mimeType: 'application/pdf', maxBytes: BINARY_PREVIEW_BYTES, signature: bytes => new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' },
}

/** Return the stat-time preview format policy for one path, if supported. */
export function previewFormat(path: string): PreviewFormat | undefined {
  return FORMATS[extname(path).toLowerCase()]
}

/**
 * Convert bounded file bytes into a transport-safe preview payload.
 * @param format - extension-selected static format.
 * @param bytes - complete file content.
 * @returns a payload, or undefined when signature/UTF-8 validation fails.
 */
export function decodePreview(format: PreviewFormat, bytes: Uint8Array): FilePreview | undefined {
  if (format.signature !== undefined && !format.signature(bytes)) return undefined
  if (format.kind === 'image' || format.kind === 'pdf') {
    return {
      kind: format.kind,
      mimeType: format.mimeType,
      contentBase64: Buffer.from(bytes).toString('base64'),
      size: bytes.byteLength,
    }
  }
  try {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { kind: format.kind, mimeType: format.mimeType, content, size: bytes.byteLength }
  } catch {
    return undefined
  }
}

/**
 * Whether this package would render the file at `path`.
 *
 * The browser half asks before intercepting a file-open gesture: a path it
 * cannot render must reach the harness's own opener untouched, so the user
 * still gets the native behaviour they had before this plugin was installed.
 * @param path - the path the gesture would open.
 */
export function isPreviewablePath(path: string): boolean {
  return previewFormat(path) !== undefined
}
