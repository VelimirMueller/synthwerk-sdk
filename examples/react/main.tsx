// Tiny @synthwerk/react example: sign-in state, a streamed chat and an image label.
// Mount in any React 18.3+/19 app (Vite: `<div id="root">` and this file as the entry).
// `getToken` comes from your auth library; `appId` is needed for vision only.
import { SynthwerkProvider, useAuth, useChat, useClassify } from '@synthwerk/react'
import { type FormEvent, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

declare function getAccessToken(): Promise<string | null>

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
    <section>
      <ol>
        {chat.messages.map((m) => (
          <li key={m.id}>
            {m.role}: {m.text}
          </li>
        ))}
      </ol>
      {chat.error?.kind === 'quota' && (
        <p>Quota used up until {chat.error.resetsAt?.toLocaleString()}</p>
      )}
      {chat.error?.kind === 'not_allowed' && <p>This page may not use the chat.</p>}
      <form onSubmit={submit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} />
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

function Label() {
  const vision = useClassify()
  return (
    <section>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void vision.classify(file)
        }}
      />
      <p>{vision.status === 'success' ? vision.data?.primary.label : vision.status}</p>
    </section>
  )
}

function App() {
  const auth = useAuth()
  if (auth.status !== 'signed_in')
    return <p>{auth.status === 'signed_out' ? 'Please sign in.' : '…'}</p>
  return (
    <>
      <Chat />
      <Label />
    </>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <SynthwerkProvider
      options={{
        apiUrl: 'https://api.example.com',
        appId: 'your-app-id',
        getToken: () => getAccessToken()
      }}
    >
      <App />
    </SynthwerkProvider>
  )
}
