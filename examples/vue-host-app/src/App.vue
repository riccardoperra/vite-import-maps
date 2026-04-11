<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const RemoteCounter = defineAsyncComponent(() => {
  const remoteCounterUrl = `${window.location.origin}/vue-remote-counter.js`;
  return import(/* @vite-ignore */ remoteCounterUrl).then((mod) => mod.Counter);
});
</script>

<template>
  <h1>You did it!</h1>
  <RemoteCounter/>
</template>

<style scoped></style>
