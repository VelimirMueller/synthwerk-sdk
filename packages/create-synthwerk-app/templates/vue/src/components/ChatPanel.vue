<script setup lang="ts">
// One chat conversation. Tokens arrive in the last assistant message as they stream.
import { SwButton, SwInput } from '@synthwerk/ui-vue'
import { useChat } from '@synthwerk/vue'
import { computed, ref } from 'vue'

const chat = useChat()
const draft = ref('')

const errorText = computed(() => {
  const error = chat.error.value
  if (!error) return null
  if (error.kind === 'quota') {
    return `Quota used up until ${error.resetsAt?.toLocaleString() ?? 'later'}.`
  }
  return `The chat failed (${error.kind}).`
})

async function submit() {
  const text = draft.value
  if (text.trim() === '') return
  draft.value = ''
  await chat.send(text)
  // A message that never reached the model comes back into an empty input once.
  if (chat.failedText.value && draft.value === '') draft.value = chat.failedText.value
}
</script>

<template>
  <section aria-label="Chat">
    <ol>
      <li v-for="m in chat.messages.value" :key="m.id" :data-role="m.role">{{ m.text }}</li>
    </ol>
    <p v-if="errorText" class="error" role="alert">{{ errorText }}</p>
    <form @submit.prevent="submit">
      <SwInput v-model="draft" aria-label="Message" />
      <SwButton v-if="chat.streaming.value" kind="secondary" @click="chat.stop">Stop</SwButton>
      <SwButton v-else type="submit">Send</SwButton>
    </form>
  </section>
</template>
