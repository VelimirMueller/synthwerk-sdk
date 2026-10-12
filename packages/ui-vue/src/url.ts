/** URL schemes a component may put into `href`. Relative URLs and `#fragment` are always allowed. */
export const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const

/** C0 controls, space, DEL and C1 controls. Browsers ignore them inside a scheme. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the controls are what we strip
const IGNORED = /[\u0000- \u007F-\u009F]/g
const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/**
 * Returns a link target that cannot run script, or `undefined`.
 * - Strips whitespace and control characters first, so `java\tscript:` and
 *   `\u0000javascript:` are seen as `javascript:`.
 * - Allows relative URLs, `#fragment`, `http:`, `https:`, `mailto:` and `tel:`.
 * - Everything else (`javascript:`, `data:`, `vbscript:`, unknown schemes) gives `undefined`.
 */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const url = value.replace(IGNORED, '')
  if (url === '') return undefined
  const scheme = url.match(SCHEME)?.[1]?.toLowerCase()
  if (scheme === undefined) return url
  return (SAFE_SCHEMES as readonly string[]).includes(scheme) ? url : undefined
}
