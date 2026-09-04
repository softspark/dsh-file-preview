/**
 * Dictionaries for the preview modal.
 *
 * Every refusal the host can return is rendered from this closed set rather
 * than from host-supplied text: a failure message must never be able to carry
 * a path, a byte, or anything else the refusal was meant to withhold.
 * @module @softspark/dsh-file-preview/client/locales
 */

/** Locale namespace owned by this package. */
export const NS = 'file-preview'

/** Every key this package translates. */
export type FilePreviewKey =
  | 'preview.close'
  | 'preview.loading'
  | 'preview.retry'
  | 'preview.notFound'
  | 'preview.unsupported'
  | 'preview.tooLarge'
  | 'preview.denied'
  | 'preview.loadError'

/** English dictionary. */
export const en: Record<FilePreviewKey, string> = {
  'preview.close': 'Close file preview',
  'preview.loading': 'Loading…',
  'preview.retry': 'Retry',
  'preview.notFound': 'The file does not exist or has been moved',
  'preview.unsupported': 'This file type cannot be previewed',
  'preview.tooLarge': 'The file is too large to preview',
  'preview.denied': 'This session is not allowed to read that file',
  'preview.loadError': 'The preview could not be loaded',
}

/**
 * Chinese dictionary.
 *
 * `zh` and `en` are the locales the harness's dictionary type admits; a third
 * language would typecheck nowhere and render nowhere.
 */
export const zh: Record<FilePreviewKey, string> = {
  'preview.close': '关闭文件预览',
  'preview.loading': '读取中',
  'preview.retry': '重试',
  'preview.notFound': '文件不存在或已被移动',
  'preview.unsupported': '无法预览此文件类型',
  'preview.tooLarge': '文件过大，无法预览',
  'preview.denied': '当前会话无权读取该文件',
  'preview.loadError': '无法加载预览',
}

/** The namespace type the slots service merges into its locale map. */
export type NS = typeof NS
