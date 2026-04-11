<template>
  <button @click="increment">Count: {{ count }}</button>
</template>

<script setup>
import { ref } from "vue";

const count = ref(0);

function increment() {
  count.value++;
}
</script>
