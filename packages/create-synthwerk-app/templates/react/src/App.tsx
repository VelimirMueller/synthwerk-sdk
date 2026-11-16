// The app: sign-in state from the SDK, the org from identity, and a streamed chat.
import { SynthwerkProvider, useAuth, useChat, useSynthwerk } from '@synthwerk/react'
import { type FormEvent, useEffect, useState } from 'react'
import type { Auth } from './auth.ts'

export interface RootProps {
  auth: Auth
  apiUrl: string
  /** Tests pass a mock of the edge. */
  fetch?: (input: Request) => Promise<Response>
}

export function Root({ auth, apiUrl, fetch }: RootProps) {
  return (
    <SynthwerkProvider options={{ apiUrl, getToken: auth.getToken, ...(fetch ? { fetch } : {}) }}>
      <App auth={auth} />
    </SynthwerkProvider>
  )
}

export function Setup({ missing }: { missing: readonly string[] }) {
  return (
    <main>
      <h1>Almost there</h1>
      <p>Copy .env.example to .env.local and set:</p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </main>
  )
}

function App({ auth }: { auth: Auth }) {
  const session = useAuth()

  async function signIn() {
    await auth.signIn()
    // A real sign-in leaves the page; this check matters for in-page sign-ins.
    await session.sessionChanged()
  }

  async function signOut() {
    await auth.signOut()
    session.signOut()
  }

  if (session.status === 'unknown' || session.status === 'checking') {
    return (
      <main>
        <p className="muted">Checking sign-in …</p>
      </main>
    )
  }
  if (session.status === 'signed_out') {
    return (
      <main>
        <h1>Synthwerk app</h1>
        <p>Sign in to chat.</p>
        <button type="button" onClick={() => void signIn()}>
          Sign in
        </button>
      </main>
    )
  }
  return (
    <main>
      <header>
        <Profile />
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <Chat />
    </main>
  )
}

/** The org and roles of the user, from identity `GET /v1/me`. */
function Profile() {
  const { sw } = useSynthwerk()
  const [label, setLabel] = useState('Signed in')
  useEffect(() => {
    let live = true
    void sw.api.identity.GET('/v1/me').then(({ data }) => {
      if (live && data) setLabel(`${data.org.name} · ${data.roles.join(', ')}`)
    })
    return () => {
      live = false
    }
  }, [sw])
  return <p>{label}</p>
}

function Chat() {
  const chat = useChat()
  const [draft, setDraft] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft
    setDraft('')
    await chat.send(text)
  }

  // A message that never reached the model comes back into the input once.
  useEffect(() => {
    if (chat.failedText) setDraft(chat.failedText)
  }, [chat.failedText])

  return (
    <section aria-label="Chat">
      <ol>
        {chat.messages.map((m) => (
          <li key={m.id} data-role={m.role}>
            {m.text}
          </li>
        ))}
      </ol>
      {chat.error && (
        <p className="error" role="alert">
          {chat.error.kind === 'quota'
            ? `Quota used up until ${chat.error.resetsAt?.toLocaleString() ?? 'later'}.`
            : `The chat failed (${chat.error.kind}).`}
        </p>
      )}
      <form onSubmit={submit}>
        <input
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {chat.streaming ? (
          <button type="button" onClick={chat.stop}>
            Stop
          </button>
        ) : (
          <button type="submit">Send</button>
        )}
      </form>
    </section>
  )
}
