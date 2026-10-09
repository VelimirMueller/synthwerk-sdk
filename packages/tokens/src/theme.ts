import { defaultMode, type Mode, type ThemeName, themeNames } from './tokens.ts'

/** Stored mode choice. `undefined` means "the user stored nothing". */
export type StoredMode = Mode | 'system' | undefined

/** localStorage key shared by studio, widgets and SDK apps (synthwerk-sdk §5). */
export const PREFS_KEY = 'sw:prefs:v1'

export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && (themeNames as readonly string[]).includes(value)

/**
 * Effective mode for a theme (brand doc §2 Q1).
 * 1. A stored `light` or `dark` always wins.
 * 2. A stored `system` follows the OS.
 * 3. Nothing stored: `default` follows the OS, `cyberpunk` is dark.
 */
export function resolveMode(theme: ThemeName, stored: StoredMode, systemDark: boolean): Mode {
  if (stored === 'light' || stored === 'dark') return stored
  const choice = stored ?? defaultMode[theme]
  if (choice === 'system') return systemDark ? 'dark' : 'light'
  return choice
}

/**
 * Inline this script in `<head>` before any stylesheet paints the page.
 * It copies the stored choice to `data-theme` and `data-mode` on `<html>`.
 * The CSS in `tokens.css` does the rest, also without JavaScript.
 */
export const firstPaintScript = `(function(){try{var p=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}')||{},d=document.documentElement;if(p.theme==='default'||p.theme==='cyberpunk')d.setAttribute('data-theme',p.theme);if(p.mode==='light'||p.mode==='dark'||p.mode==='system')d.setAttribute('data-mode',p.mode)}catch(e){}})()`
