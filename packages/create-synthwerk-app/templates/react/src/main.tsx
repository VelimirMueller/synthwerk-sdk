// Entry: reads .env.local, finishes a sign-in redirect, then renders the app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root, Setup } from './App.tsx'
import { createOidcAuth } from './auth.ts'
import { readConfig } from './config.ts'
import './style.css'

const element = document.getElementById('root')
if (!element) throw new Error('index.html needs <div id="root">')
const root = createRoot(element)
const result = readConfig()

if (!result.ok) {
  root.render(<Setup missing={result.missing} />)
} else {
  const auth = createOidcAuth(result.config)
  // A failed redirect (for example an old link) leaves the user signed out.
  await auth.handleRedirect().catch((error: unknown) => console.warn('Sign-in failed', error))
  root.render(
    <StrictMode>
      <Root auth={auth} apiUrl={result.config.apiUrl} />
    </StrictMode>
  )
}
