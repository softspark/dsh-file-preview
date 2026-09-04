import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FileOpenRequest } from '../types.ts'
import type {
  FilePreview,
  FilePreviewFailure,
  FilePreviewResult,
} from '../types.ts'
import type { NS } from './locales.ts'
import { basename } from './path.ts'
import css from './FilePreviewModal.module.css'

const HTML_ELEMENTS = new Set([
  'article', 'aside', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'ins',
  'kbd', 'li', 'main', 'mark', 'ol', 'p', 'pre', 'q', 's', 'section', 'small',
  'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'tr', 'u', 'ul',
])

const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'title', 'desc',
])

const SVG_ATTRIBUTES = new Set([
  'xmlns', 'viewbox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx',
  'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity',
  'opacity', 'transform', 'font-family', 'font-size', 'font-weight', 'text-anchor',
])

const UNSAFE_SVG_VALUE = /(?:url\s*\(|javascript:|data:|https?:|@import|[\u0000-\u0008\u000b\u000c\u000e-\u001f])/iu

/** Remove every executable, navigable, styling, and externally loading HTML surface. */
export function sanitizeHtmlDocument(source: string): string {
  const document = new DOMParser().parseFromString(source, 'text/html')
  const sanitizeChildren = (parent: Element): void => {
    for (const child of [...parent.children]) {
      const name = child.localName.toLowerCase()
      if (!HTML_ELEMENTS.has(name)) {
        if (['script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'form', 'svg', 'math'].includes(name)) {
          child.remove()
        } else {
          sanitizeChildren(child)
          child.replaceWith(...child.childNodes)
        }
        continue
      }
      for (const attribute of [...child.attributes]) child.removeAttribute(attribute.name)
      sanitizeChildren(child)
    }
  }
  const comments = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
  let comment = comments.nextNode()
  while (comment !== null) {
    const next = comments.nextNode()
    comment.parentNode?.removeChild(comment)
    comment = next
  }
  sanitizeChildren(document.body)
  return document.body.innerHTML
}

/** Reduce SVG to inert drawing primitives with local scalar attributes only. */
export function sanitizeSvgDocument(source: string): string {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = document.documentElement
  if (root.localName.toLowerCase() !== 'svg' || root.querySelector('parsererror') !== null) return ''

  const sanitizeElement = (element: Element): void => {
    for (const child of [...element.children]) {
      if (!SVG_ELEMENTS.has(child.localName.toLowerCase())) {
        child.remove()
        continue
      }
      sanitizeElement(child)
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      const isNamespace = name === 'xmlns' && attribute.value === 'http://www.w3.org/2000/svg'
      if ((!SVG_ATTRIBUTES.has(name) || UNSAFE_SVG_VALUE.test(attribute.value)) && !isNamespace) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  sanitizeElement(root)
  return new XMLSerializer().serializeToString(root)
}

type PreviewState =
  | { request: FileOpenRequest; retry: number; status: 'loading' }
  | { request: FileOpenRequest; retry: number; status: 'ready'; preview: FilePreview }
  | { request: FileOpenRequest; retry: number; status: 'error'; failure?: FilePreviewFailure }

export interface FilePreviewModalProps {
  request: FileOpenRequest
  previewFile: (request: FileOpenRequest, signal: AbortSignal) => Promise<FilePreviewResult>
  onClose: () => void
  t: TranslateNS<typeof NS>
}

function failureKey(failure: FilePreviewFailure | undefined):
  | 'preview.notFound'
  | 'preview.unsupported'
  | 'preview.tooLarge'
  | 'preview.denied'
  | 'preview.loadError' {
  switch (failure?.code) {
    case 'preview-not-found': return 'preview.notFound'
    case 'preview-unsupported': return 'preview.unsupported'
    case 'preview-too-large': return 'preview.tooLarge'
    case 'permission-denied':
    case 'preview-outside-workspace': return 'preview.denied'
    default: return 'preview.loadError'
  }
}

/** Safe, dependency-free Markdown subset: headings, lists, fenced code, and paragraphs. */
function MarkdownPreview({ source }: { source: string }) {
  const nodes: ReactNode[] = []
  const lines = source.split(/\r?\n/u)
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').startsWith('```')) {
        code.push(lines[index] ?? '')
        index += 1
      }
      nodes.push(<pre key={index}><code>{code.join('\n')}</code></pre>)
    } else {
      const heading = /^(#{1,6})\s+(.+)$/u.exec(line)
      if (heading !== null) {
        const level = (heading[1] ?? '').length
        nodes.push(createElement(`h${String(level)}`, { key: index }, heading[2]))
      } else if (/^[-*+]\s+/u.test(line)) {
        const items: ReactNode[] = []
        while (index < lines.length && /^[-*+]\s+/u.test(lines[index] ?? '')) {
          items.push(<li key={index}>{(lines[index] ?? '').replace(/^[-*+]\s+/u, '')}</li>)
          index += 1
        }
        nodes.push(<ul key={`list-${String(index)}`}>{items}</ul>)
        continue
      } else if (line.trim() !== '') {
        nodes.push(<p key={index}>{line}</p>)
      }
    }
    index += 1
  }
  return <>{nodes}</>
}

function PreviewBody({ preview, title }: { preview: FilePreview; title: string }) {
  if (preview.kind === 'text') {
    return preview.mimeType === 'text/markdown'
      ? <div className={css.markdown}><MarkdownPreview source={preview.content} /></div>
      : <pre className={css.text}>{preview.content}</pre>
  }
  if (preview.kind === 'html') {
    const html = sanitizeHtmlDocument(preview.content)
    return <div className={css.document} dangerouslySetInnerHTML={{ __html: html }} />
  }
  if (preview.kind === 'svg') {
    const svg = sanitizeSvgDocument(preview.content)
    if (svg === '') return <div className={css.empty}>SVG could not be rendered safely.</div>
    return <img className={css.image} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={title} />
  }
  if (preview.kind === 'image') {
    const safeMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(preview.mimeType)
      ? preview.mimeType
      : 'application/octet-stream'
    return safeMime === 'application/octet-stream'
      ? <div className={css.empty}>Image format is not supported.</div>
      : <img className={css.image} src={`data:${safeMime};base64,${preview.contentBase64}`} alt={title} />
  }
  if (!('contentBase64' in preview)) {
    return <div className={css.empty}>File format is not supported.</div>
  }
  return (
    <iframe
      className={css.pdf}
      src={`data:application/pdf;base64,${preview.contentBase64}`}
      title={title}
      sandbox=""
    />
  )
}

/** One preview dialog shared by every file-open gesture in a conversation. */
export function FilePreviewModal({ request, previewFile, onClose, t }: FilePreviewModalProps) {
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<PreviewState>({ request, retry, status: 'loading' })
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const title = basename(request.path)
  const visibleState: PreviewState = state.request === request && state.retry === retry
    ? state
    : { request, retry, status: 'loading' }

  useEffect(() => {
    const controller = new AbortController()
    setState({ request, retry, status: 'loading' })
    void previewFile(request, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setState(result.ok
          ? { request, retry, status: 'ready', preview: result.value }
          : { request, retry, status: 'error', failure: result.error })
      },
      () => {
        if (!controller.signal.aborted) setState({ request, retry, status: 'error' })
      },
    )
    return () => { controller.abort() }
  }, [previewFile, request, retry])

  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => { previous?.focus() }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (dialog === null) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.hasAttribute('disabled'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (first === undefined || last === undefined) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  return (
    <div className={css.root} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={onClose} />
      <div ref={dialogRef} className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="workspace-file-preview-title">
        <header className={css.header}>
          <div className={css.heading}>
            <h2 id="workspace-file-preview-title" className={css.title}>{title}</h2>
            <span className={css.path} title={request.resolvedPath}>{request.resolvedPath}</span>
          </div>
          <button ref={closeRef} type="button" className={css.close} aria-label={t('preview.close')} onClick={onClose}>
            <IconCloseOutline16 />
          </button>
        </header>
        <main className={css.body}>
          {visibleState.status === 'loading' && <div className={css.message} role="status" aria-live="polite">{t('preview.loading')}</div>}
          {visibleState.status === 'error' && (
            <div className={css.message} role="alert">
              <span>{t(failureKey(visibleState.failure))}</span>
              <button type="button" className={css.retry} onClick={() => { setRetry(value => value + 1) }}>{t('preview.retry')}</button>
            </div>
          )}
          {visibleState.status === 'ready' && <PreviewBody preview={visibleState.preview} title={title} />}
        </main>
      </div>
    </div>
  )
}
