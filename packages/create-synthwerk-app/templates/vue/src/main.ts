// Entry: reads .env.local, finishes a sign-in redirect, then mounts the app.
import { createSynthwerk } from '@synthwerk/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { createOidcAuth } from './auth.ts'
import SetupPage from './components/SetupPage.vue'
import { readConfig } from './config.ts'
import './style.css'

const result = readConfig()

if (!result.ok) {
  createApp(SetupPage, { missing: result.missing }).mount('#app')
} else {
  const auth = createOidcAuth(result.config)
  // A failed redirect (for example an old link) leaves the user signed out.
  await auth.handleRedirect().catch((error: unknown) => console.warn('Sign-in failed', error))
  createApp(App, { auth })
    .use(createSynthwerk({ apiUrl: result.config.apiUrl, getToken: auth.getToken }))
    .mount('#app')
}
