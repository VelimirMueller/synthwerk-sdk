<script setup lang="ts">
defineProps<{ missing: readonly string[] }>()
</script>

<template>
  <main>
    <h1>Almost there</h1>
    <p>Copy .env.example to .env.local and set:</p>
    <ul>
      <li v-for="name in missing" :key="name"><code>{{ name }}</code></li>
    </ul>
  </main>
</template>
