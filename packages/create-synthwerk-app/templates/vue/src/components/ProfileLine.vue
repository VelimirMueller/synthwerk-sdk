<script setup lang="ts">
// The org and roles of the user, from identity `GET /v1/me`.
import { useSynthwerk } from '@synthwerk/vue'
import { onMounted, onScopeDispose, ref } from 'vue'

const { sw } = useSynthwerk()
const label = ref('Signed in')
let live = true
onScopeDispose(() => {
  live = false
})
onMounted(async () => {
  const { data } = await sw.api.identity.GET('/v1/me')
  if (live && data) label.value = `${data.org.name} · ${data.roles.join(', ')}`
})
</script>

<template>
  <p>{{ label }}</p>
</template>
