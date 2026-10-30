<script setup lang="ts">
import { useAuth, useChat, useClassify } from '@synthwerk/vue'
import { ref } from 'vue'

const auth = useAuth()
const chat = useChat()
const vision = useClassify()
const draft = ref('')

async function submit() {
  const text = draft.value
  draft.value = ''
  await chat.send(text)
  if (chat.failedText.value) draft.value = chat.failedText.value
}

function pick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void vision.classify(file)
}
</script>

<template>
  <p v-if="auth.status.value !== 'signed_in'">
    {{ auth.status.value === 'signed_out' ? 'Please sign in.' : '…' }}
  </p>
  <template v-else>
    <section>
      <ol>
        <li v-for="m in chat.messages.value" :key="m.id">{{ m.role }}: {{ m.text }}</li>
      </ol>
      <p v-if="chat.error.value?.kind === 'quota'">
        Quota used up until {{ chat.error.value.resetsAt?.toLocaleString() }}
      </p>
      <p v-if="chat.error.value?.kind === 'not_allowed'">This page may not use the chat.</p>
      <form @submit.prevent="submit">
        <input v-model="draft">
        <button v-if="chat.streaming.value" type="button" @click="chat.stop">Stop</button>
        <button v-else type="submit">Send</button>
      </form>
    </section>
    <section>
      <input type="file" accept="image/jpeg,image/png,image/webp" @change="pick">
      <p>
        {{
          vision.status.value === 'success' ? vision.data.value?.primary.label : vision.status.value
        }}
      </p>
    </section>
  </template>
</template>
