// Tiny @synthwerk/vue example: sign-in state, a streamed chat and an image label.
// Vite + Vue 3.5: `<div id="app">` and this file as the entry.
// `getToken` comes from your auth library; `appId` is needed for vision only.
import { createSynthwerk } from '@synthwerk/vue'
import { createApp } from 'vue'
import App from './App.vue'

declare function getAccessToken(): Promise<string | null>

createApp(App)
  .use(
    createSynthwerk({
      apiUrl: 'https://api.example.com',
      appId: 'your-app-id',
      getToken: () => getAccessToken()
    })
  )
  .mount('#app')
