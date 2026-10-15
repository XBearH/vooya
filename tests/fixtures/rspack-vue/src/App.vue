<script setup lang="ts">
import { ref } from "vue";
import Counter from "./Counter.rs";

const value = ref(2);
const visible = ref(true);
const emitted = ref(0);
</script>

<template>
  <button data-host-update @click="value += 2">Update prop</button>
  <button data-host-toggle @click="visible = !visible">Toggle island</button>
  <Counter v-if="visible" :initial="value" @change="emitted = $event" />
  <output data-event>{{ emitted }}</output>
</template>
