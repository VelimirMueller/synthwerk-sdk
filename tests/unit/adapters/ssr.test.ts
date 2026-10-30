// Node environment: no window, no document. Import and server render must not touch them
// and must not ask for a token.
import { createElement } from 'react'
import { renderToString as renderReact } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString as renderVue } from 'vue/server-renderer'
import * as react from '../../../packages/react/src/index.ts'
import * as vue from '../../../packages/vue/src/index.ts'

describe('adapters on the server', () => {
  it('import - no window in this environment', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined')
    expect(typeof react.useChat).toBe('function')
    expect(typeof vue.useChat).toBe('function')
  })

  it('react renderToString - status unknown, getToken never called', () => {
    const getToken = vi.fn(() => 'token')
    function Page() {
      const auth = react.useAuth()
      const chat = react.useChat()
      const vision = react.useClassify()
      return createElement('p', null, `${auth.status}|${chat.messages.length}|${vision.status}`)
    }
    const html = renderReact(
      createElement(
        react.SynthwerkProvider,
        { options: { apiUrl: 'https://api.test', getToken } },
        createElement(Page)
      )
    )
    expect(html).toBe('<p>unknown|0|idle</p>')
    expect(getToken).not.toHaveBeenCalled()
  })

  it('vue renderToString - status unknown, getToken never called', async () => {
    const getToken = vi.fn(() => 'token')
    const Page = defineComponent(() => {
      const auth = vue.useAuth()
      const chat = vue.useChat()
      const vision = vue.useClassify()
      return () =>
        h('p', `${auth.status.value}|${chat.messages.value.length}|${vision.status.value}`)
    })
    const app = createSSRApp(Page).use(
      vue.createSynthwerk({ apiUrl: 'https://api.test', getToken })
    )
    expect(await renderVue(app)).toBe('<p>unknown|0|idle</p>')
    expect(getToken).not.toHaveBeenCalled()
  })
})
