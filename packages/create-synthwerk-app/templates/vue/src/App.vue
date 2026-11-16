<script setup lang="ts">
// The app: sign-in state from the SDK, the org from identity, and a streamed chat.
import { SwButton } from '@synthwerk/ui-vue'
import { useAuth } from '@synthwerk/vue'
import type { Auth } from './auth.ts'
import ChatPanel from './components/ChatPanel.vue'
import ProfileLine from './components/ProfileLine.vue'

const props = defineProps<{ auth: Auth }>()
const session = useAuth()

async function signIn() {
  await props.auth.signIn()
  // A real sign-in leaves the page; this check matters for in-page sign-ins.
  await session.sessionChanged()
}

async function signOut() {
  await props.auth.signOut()
  // Synchronous: the SDK drops the chat and shows signed_out at once.
  session.signOut()
}
</script>

<template>
  <main>
    <p
      v-if="session.status.value === 'unknown' || session.status.value === 'checking'"
      class="muted"
    >
      Checking sign-in …
    </p>
    <template v-else-if="session.status.value === 'signed_out'">
      <h1>Synthwerk app</h1>
      <p>Sign in to chat.</p>
      <SwButton @click="signIn">Sign in</SwButton>
    </template>
    <template v-else>
      <header>
        <ProfileLine />
        <SwButton kind="secondary" @click="signOut">Sign out</SwButton>
      </header>
      <ChatPanel />
    </template>
  </main>
</template>
