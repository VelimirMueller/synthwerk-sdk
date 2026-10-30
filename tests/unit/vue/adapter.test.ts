// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, effectScope, h } from 'vue'
import {
  createSynthwerk,
  createSynthwerkApp,
  type GetToken,
  provideSynthwerk,
  useAuth,
  useChat,
  useClassify,
  useSynthwerk
} from '../../../packages/vue/src/index.ts'
import { appId, delta, done, fakeEdge, tick } from '../../support/fake-edge.ts'
import { jwt, problemResponse } from '../../support/fake-fetch.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const alice = jwt({ sub: 'alice' })
const bob = jwt({ sub: 'bob' })

function plugin(edge: ReturnType<typeof fakeEdge>, getToken: GetToken = () => alice) {
  return createSynthwerk({ apiUrl: 'https://api.test', getToken, appId, fetch: edge.fetch })
}

const Chat = defineComponent(() => {
  const chat = useChat()
  return () =>
    h('div', [
      h(
        'ol',
        chat.messages.value.map((m) =>
          h('li', { key: m.id, 'data-status': m.status }, `${m.role}:${m.text}`)
        )
      ),
      h('p', { class: 's' }, chat.streaming.value ? 'streaming' : 'idle'),
      h('p', { class: 'e' }, `error:${chat.error.value?.kind ?? 'none'}`),
      h('p', { class: 'f' }, `failed:${chat.failedText.value ?? ''}`),
      h('button', { class: 'send', onClick: () => void chat.send('Hi') }, 'send')
    ])
})

async function untilStream(edge: ReturnType<typeof fakeEdge>) {
  for (let i = 0; i < 50 && edge.streams.length === 0; i++) await tick()
  const stream = edge.streams.at(-1)
  if (!stream) throw new Error('no stream')
  return stream
}

describe('@synthwerk/vue', () => {
  it('useChat - renders tokens as they stream, then idle', async () => {
    const edge = fakeEdge()
    const wrapper = mount(Chat, { global: { plugins: [plugin(edge)] } })
    await wrapper.find('button.send').trigger('click')
    const stream = await untilStream(edge)
    expect(wrapper.find('.s').text()).toBe('streaming')
    stream.write(delta('Hel'))
    await tick()
    expect(wrapper.text()).toContain('assistant:Hel')
    stream.write(delta('lo', 2) + done)
    await tick()
    await flushPromises()
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['user:Hi', 'assistant:Hello'])
    expect(wrapper.find('.s').text()).toBe('idle')
  })

  it('useChat - unmount aborts the open stream', async () => {
    const edge = fakeEdge()
    const wrapper = mount(Chat, { global: { plugins: [plugin(edge)] } })
    await wrapper.find('button.send').trigger('click')
    await untilStream(edge)
    wrapper.unmount()
    expect(edge.calls.at(-1)?.signal.aborted).toBe(true)
  })

  it('useChat - quota and origin errors map to quota and not_allowed', async () => {
    for (const [status, code, kind] of [
      [429, 'quota_exhausted', 'quota'],
      [403, 'origin_not_allowed', 'not_allowed']
    ] as const) {
      const edge = fakeEdge()
      edge.routes.push((r) =>
        r.url.endsWith('/messages') ? problemResponse(status, code) : undefined
      )
      const wrapper = mount(Chat, { global: { plugins: [plugin(edge)] } })
      await wrapper.find('button.send').trigger('click')
      await flushPromises()
      await tick()
      expect(wrapper.find('.e').text()).toBe(`error:${kind}`)
      expect(wrapper.find('.f').text()).toBe('failed:Hi')
    }
  })

  it('useAuth - checks on mount; user switch clears the chat', async () => {
    const edge = fakeEdge()
    let token = alice
    const p = plugin(edge, () => token)
    const Auth = defineComponent(() => {
      const auth = useAuth()
      return () => h('p', { class: 'a' }, `${auth.status.value}:${auth.user.value?.subject ?? ''}`)
    })
    const Both = defineComponent(() => () => h('div', [h(Auth), h(Chat)]))
    const wrapper = mount(Both, { global: { plugins: [p] } })
    await flushPromises()
    expect(wrapper.find('.a').text()).toBe('signed_in:alice')
    await wrapper.find('button.send').trigger('click')
    const stream = await untilStream(edge)
    stream.write(delta('for alice') + done)
    await tick()
    await flushPromises()
    expect(wrapper.text()).toContain('assistant:for alice')
    token = bob
    await p.app.sessionChanged()
    await flushPromises()
    expect(wrapper.find('.a').text()).toBe('signed_in:bob')
    expect(wrapper.findAll('li')).toHaveLength(0)
    p.app.signOut()
    await flushPromises()
    expect(wrapper.find('.a').text()).toBe('signed_out:')
  })

  it('useClassify - success with the widget token', async () => {
    const edge = fakeEdge()
    const Classify = defineComponent(() => {
      const vision = useClassify()
      return () =>
        h('div', [
          h('p', `${vision.status.value}:${vision.data.value?.primary.label ?? ''}`),
          h(
            'button',
            { onClick: () => void vision.classify(new Blob(['x'], { type: 'image/png' })) },
            'go'
          )
        ])
    })
    const wrapper = mount(Classify, { global: { plugins: [plugin(edge)] } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await tick()
    expect(wrapper.find('p').text()).toBe('success:hut')
    const call = edge.calls.find((r) => r.url.endsWith('/v1/classifications'))
    expect(call?.headers.get('authorization')).toBe('Bearer wt-1')
    expect(wrapper.vm).toBeTruthy()
  })

  it('provideSynthwerk - subtree gets the shared app', () => {
    const edge = fakeEdge()
    const app = createSynthwerkApp({
      apiUrl: 'https://api.test',
      getToken: () => alice,
      fetch: edge.fetch
    })
    const Child = defineComponent(() => () => h('p', useSynthwerk() === app ? 'same' : 'other'))
    const Parent = defineComponent(() => {
      provideSynthwerk({ app })
      return () => h(Child)
    })
    expect(mount(Parent).text()).toBe('same')
  })

  it('useAuth in a bare effect scope (app.runWithContext) - checks at once; stop unsubscribes', async () => {
    const edge = fakeEdge()
    const p = plugin(edge)
    const vueApp = createApp(defineComponent(() => () => null)).use(p)
    const scope = effectScope()
    const auth = vueApp.runWithContext(() => scope.run(() => useAuth()))
    await flushPromises()
    expect(auth?.status.value).toBe('signed_in')
    scope.stop()
    p.app.signOut()
    // The stopped scope no longer follows the store.
    expect(auth?.status.value).toBe('signed_in')
  })

  it('outside the plugin - throws a clear error', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const Broken = defineComponent(() => {
      useChat()
      return () => null
    })
    expect(() => mount(Broken)).toThrow(/createSynthwerk/)
  })
})
