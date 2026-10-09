// Minimal types for the parts of opentype.js 2.0.0 that outline-wordmark.ts uses.
// opentype.js 2.0.0 ships no type declarations, and @types/opentype.js covers 1.x only.
declare module 'opentype.js' {
  interface BoundingBox {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  interface Path {
    toPathData(decimalPlaces?: number): string
    getBoundingBox(): BoundingBox
  }
  interface RenderOptions {
    kerning?: boolean
    letterSpacing?: number
    variation?: Record<string, number>
  }
  interface Glyph {
    advanceWidth: number
    getPath(x: number, y: number, fontSize: number, options: RenderOptions, font: Font): Path
  }
  interface Font {
    unitsPerEm: number
    stringToGlyphs(text: string): Glyph[]
    getKerningValue(left: Glyph, right: Glyph): number
    variation: { set(coords: Record<string, number>): void }
    getPath(text: string, x: number, y: number, fontSize: number, options?: RenderOptions): Path
  }
  const opentype: { parse(buffer: ArrayBuffer): Font }
  export default opentype
}
