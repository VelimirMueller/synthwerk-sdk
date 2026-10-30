// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h, type ReactNode, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSynthwerkApp,
  type GetToken,
  SynthwerkProvider,
  useAuth,
  useChat,
  useClassify,
  useSynthwerk
} from '../../../packages/react/src/index.ts'
import { appId, delta, done, fakeEdge, tick } from '../../support/fake-edge.ts'
import { jwt, problemResponse } from '../../support/fake-fetch.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const alice = jwt({ sub: 'alice' })
const bob = jwt({ sub: 'bob' })

function wrap(edge: ReturnType<typeof fakeEdge>, getToken: GetToken = () => alice) {
  return (children: ReactNode) =>
    h(
      SynthwerkProvider,
      { options: { apiUrl: 'https://api.test', getToken, appId, fetch: edge.fetch } },
      children
    )
}

function Chat() {
  const chat = useChat()
  return h('div', null, [
    h(
      'ol',
      { key: 'l' },
      chat.messages.map((m) =>
        h('li', { key: m.id, 'data-status': m.status }, `${m.role}:${m.text}`)
      )
    ),
    h('p', { key: 's' }, chat.streaming ? 'streaming' : 'idle'),
    h('p', { key: 'e' }, `error:${chat.error?.kind ?? 'none'}`),
    h('p', { key: 'f' }, `failed:${chat.failedText ?? ''}`),
    h('button', { key: 'b', type: 'button', onClick: () => void chat.send('Hi') }, 'send'),
    h('button', { key: 'x', type: 'button', onClick: chat.stop }, 'stop')
  ])
}

async function untilStream(edge: ReturnType<typeof fakeEdge>) {
  await waitFor(() => expect(edge.streams.length).toBeGreaterThan(0))
  return edge.streams[edge.streams.length - 1] as (typeof edge.streams)[number]
}

describe('@synthwerk/react', () => {
  it('useChat - renders tokens as they stream, then idle', async () => {
    const edge = fakeEdge()
    render(wrap(edge)(h(Chat)))
    fireEvent.click(screen.getByText('send'))
    const stream = await untilStream(edge)
    await screen.findByText('streaming')
    await act(async () => {
      stream.write(delta('Hel'))
      await tick()
    })
    expect(screen.getByText('assistant:Hel')).toBeTruthy()
    await act(async () => {
      stream.write(delta('lo', 2) + done)
      await tick()
    })
    expect(screen.getByText('assistant:Hello').getAttribute('data-status')).toBe('done')
    expect(screen.getByText('user:Hi')).toBeTruthy()
    await screen.findByText('idle')
  })

  it('useChat - unmount aborts the open stream', async () => {
    const edge = fakeEdge()
    const view = render(wrap(edge)(h(Chat)))
    fireEvent.click(screen.getByText('send'))
    await untilStream(edge)
    view.unmount()
    expect(edge.calls.at(-1)?.signal.aborted).toBe(true)
  })

  it('useChat - quota error state and the message back in failedText', async () => {
    const edge = fakeEdge()
    edge.routes.push((r) =>
      r.url.endsWith('/messages') ? problemResponse(429, 'quota_exhausted') : undefined
    )
    render(wrap(edge)(h(Chat)))
    fireEvent.click(screen.getByText('send'))
    await screen.findByText('error:quota')
    expect(screen.getByText('failed:Hi')).toBeTruthy()
  })

  it('useChat - origin not allowed (403) - not_allowed', async () => {
    const edge = fakeEdge()
    edge.routes.push((r) =>
      r.url.endsWith('/v1/conversations') ? problemResponse(403, 'origin_not_allowed') : undefined
    )
    render(wrap(edge)(h(Chat)))
    fireEvent.click(screen.getByText('send'))
    await screen.findByText('error:not_allowed')
  })

  it('useAuth - unknown, then signed_in on mount; signOut', async () => {
    const edge = fakeEdge()
    function Auth() {
      const auth = useAuth()
      return h('div', null, [
        h('p', { key: 's' }, `${auth.status}:${auth.user?.subject ?? ''}`),
        h('button', { key: 'o', type: 'button', onClick: auth.signOut }, 'out')
      ])
    }
    render(wrap(edge)(h(Auth)))
    await screen.findByText('signed_in:alice')
    fireEvent.click(screen.getByText('out'))
    await screen.findByText('signed_out:')
  })

  it('user switch - sessionChanged with another user clears the chat', async () => {
    const edge = fakeEdge()
    let token = alice
    let app!: ReturnType<typeof useSynthwerk>
    function Grab() {
      app = useSynthwerk()
      useAuth()
      return null
    }
    render(wrap(edge, () => token)([h(Grab, { key: 'g' }), h(Chat, { key: 'c' })]))
    fireEvent.click(screen.getByText('send'))
    const stream = await untilStream(edge)
    await act(async () => {
      stream.write(delta('for alice') + done)
      await tick()
    })
    await screen.findByText('assistant:for alice')
    token = bob
    await act(async () => {
      await app.sessionChanged()
    })
    expect(screen.queryByText('assistant:for alice')).toBeNull()
    expect(screen.queryByText('user:Hi')).toBeNull()
  })

  it('useClassify - success with the label', async () => {
    const edge = fakeEdge()
    function Classify() {
      const vision = useClassify()
      return h('div', null, [
        h('p', { key: 's' }, `${vision.status}:${vision.data?.primary.label ?? ''}`),
        h(
          'button',
          {
            key: 'b',
            type: 'button',
            onClick: () => void vision.classify(new Blob(['x'], { type: 'image/png' }))
          },
          'go'
        )
      ])
    }
    render(wrap(edge)(h(Classify)))
    fireEvent.click(screen.getByText('go'))
    await screen.findByText('success:hut')
    const call = edge.calls.find((r) => r.url.endsWith('/v1/classifications'))
    expect(call?.headers.get('authorization')).toBe('Bearer wt-1')
  })

  it('StrictMode - double effects keep the chat working', async () => {
    const edge = fakeEdge()
    render(h(StrictMode, null, wrap(edge)(h(Chat))))
    fireEvent.click(screen.getByText('send'))
    const stream = await untilStream(edge)
    await act(async () => {
      stream.write(delta('ok') + done)
      await tick()
    })
    await screen.findByText('assistant:ok')
  })

  it('provider - takes a shared app; the latest getToken is used', async () => {
    const edge = fakeEdge()
    const app = createSynthwerkApp({
      apiUrl: 'https://api.test',
      getToken: () => alice,
      fetch: edge.fetch
    })
    function Grab() {
      return h('p', null, useSynthwerk() === app ? 'same' : 'other')
    }
    render(h(SynthwerkProvider, { app }, h(Grab)))
    expect(screen.getByText('same')).toBeTruthy()

    const first = vi.fn(() => alice)
    const second = vi.fn(() => bob)
    function Who() {
      const auth = useAuth()
      return h('p', null, `who:${auth.user?.subject ?? ''}`)
    }
    const options = (getToken: GetToken) => ({
      apiUrl: 'https://api.test',
      getToken,
      fetch: edge.fetch
    })
    const view = render(h(SynthwerkProvider, { options: options(first) }, h(Who)))
    await screen.findByText('who:alice')
    view.rerender(h(SynthwerkProvider, { options: options(second) }, h(Who)))
    let app2!: ReturnType<typeof useSynthwerk>
    function Grab2() {
      app2 = useSynthwerk()
      return null
    }
    view.rerender(
      h(SynthwerkProvider, { options: options(second) }, [
        h(Who, { key: 'w' }),
        h(Grab2, { key: 'g' })
      ])
    )
    await act(async () => {
      await app2.checkAuth()
    })
    expect(second).toHaveBeenCalled()
    await screen.findByText('who:bob')
  })

  it('outside the provider - throws a clear error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(h(Chat))).toThrow(/SynthwerkProvider/)
    expect(() => render(h(SynthwerkProvider, {} as never))).toThrow(/options/)
  })
})
