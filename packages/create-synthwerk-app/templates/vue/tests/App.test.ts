// App tests against a mock of the edge (identity and llm). No identity provider, no network.

import { createSynthwerk } from '@synthwerk/vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.vue'
import SetupPage from '../src/components/SetupPage.vue'
import { fakeAuth } from './support/fake-auth.ts'
import { conversationId, type MockEdge, mockEdge } from './support/mock-edge.ts'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountApp(auth: ReturnType<typeof fakeAuth>, edge: MockEdge) {
  wrapper = mount(App, {
    props: { auth },
    global: {
      plugins: [
        createSynthwerk({ apiUrl: 'https://api.test', getToken: auth.getToken, fetch: edge.fetch })
      ]
    }
  })
  return wrapper
}

function button(view: VueWrapper, name: string) {
  const found = view.findAll('button').find((b) => b.text() === name)
  if (!found) throw new Error(`No button "${name}" in: ${view.html()}`)
  return found
}

describe('App', () => {
  it('signs in, then shows the org from identity', async () => {
    const edge = mockEdge()
    const view = mountApp(fakeAuth(false), edge)
    await vi.waitFor(() => button(view, 'Sign in'))
    await button(view, 'Sign in').trigger('click')
    await vi.waitFor(() => expect(view.text()).toContain('Demo org · member'))
    const call = edge.calls.find((c) => c.path === '/identity/v1/me')
    expect(call?.authorization).toMatch(/^Bearer /)
  })

  it('chats: sends the message and streams the answer', async () => {
    const edge = mockEdge(['Hello', ' there'])
    const view = mountApp(fakeAuth(true), edge)
    await vi.waitFor(() => expect(view.find('input[aria-label="Message"]').exists()).toBe(true))
    await view.find('input[aria-label="Message"]').setValue('Hi')
    await view.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(view.findAll('li').map((li) => li.text())).toEqual(['Hi', 'Hello there'])
    )
    const send = edge.calls.find(
      (c) => c.path === `/llm/v1/conversations/${conversationId}/messages`
    )
    expect(JSON.parse(send?.body ?? '{}')).toMatchObject({ content: 'Hi' })
    await vi.waitFor(() => button(view, 'Send'))
  })

  it('signs out: back to the sign-in button', async () => {
    const auth = fakeAuth(true)
    const view = mountApp(auth, mockEdge())
    await vi.waitFor(() => button(view, 'Sign out'))
    await button(view, 'Sign out').trigger('click')
    await flushPromises()
    await vi.waitFor(() => button(view, 'Sign in'))
    expect(auth.signedIn).toBe(false)
  })

  it('without settings: names the missing values', () => {
    wrapper = mount(SetupPage, { props: { missing: ['VITE_SYNTHWERK_CLIENT_ID'] } })
    expect(wrapper.text()).toContain('VITE_SYNTHWERK_CLIENT_ID')
  })
})
