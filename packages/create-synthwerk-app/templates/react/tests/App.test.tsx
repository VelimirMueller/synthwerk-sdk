// App tests against a mock of the edge (identity and llm). No identity provider, no network.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Root, Setup } from '../src/App.tsx'
import { fakeAuth } from './support/fake-auth.ts'
import { conversationId, mockEdge } from './support/mock-edge.ts'

afterEach(cleanup)

const apiUrl = 'https://api.test'

describe('App', () => {
  it('signs in, then shows the org from identity', async () => {
    const edge = mockEdge()
    render(<Root auth={fakeAuth(false)} apiUrl={apiUrl} fetch={edge.fetch} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Demo org · member')).toBeTruthy()
    const call = edge.calls.find((c) => c.path === '/identity/v1/me')
    expect(call?.authorization).toMatch(/^Bearer /)
  })

  it('chats: sends the message and streams the answer', async () => {
    const edge = mockEdge(['Hello', ' there'])
    render(<Root auth={fakeAuth(true)} apiUrl={apiUrl} fetch={edge.fetch} />)
    fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'Hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Hello there')).toBeTruthy()
    expect(screen.getByText('Hi')).toBeTruthy()
    const send = edge.calls.find(
      (c) => c.path === `/llm/v1/conversations/${conversationId}/messages`
    )
    expect(JSON.parse(send?.body ?? '{}')).toMatchObject({ content: 'Hi' })
    await screen.findByRole('button', { name: 'Send' })
  })

  it('signs out: back to the sign-in button', async () => {
    const edge = mockEdge()
    const auth = fakeAuth(true)
    render(<Root auth={auth} apiUrl={apiUrl} fetch={edge.fetch} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    await screen.findByRole('button', { name: 'Sign in' })
    expect(auth.signedIn).toBe(false)
  })

  it('without settings: names the missing values', () => {
    render(<Setup missing={['VITE_SYNTHWERK_CLIENT_ID']} />)
    expect(screen.getByText('VITE_SYNTHWERK_CLIENT_ID')).toBeTruthy()
  })
})

describe('mock edge', () => {
  it('answers 401 without a token', async () => {
    const response = await mockEdge().fetch(new Request(`${apiUrl}/identity/v1/me`))
    await waitFor(() => expect(response.status).toBe(401))
  })
})
