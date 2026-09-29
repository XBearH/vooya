<script setup lang="ts">
import { ref } from "vue";
import Island from "./Island.vue";
const visible = ref(true);
</script>
<template>
  <button @click="visible = !visible">{{ visible ? "Unmount" : "Mount" }}</button>
  <Island v-if="visible" />
</template>
