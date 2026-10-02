<script setup lang="ts">
import { ref } from "vue";
import Counter from "./Counter.rs";
import { useCart } from "./Store.rs";
const { state, add, reset } = useCart();
const selected = ref<number | null>(null);
const count = (): number => state.value ?? 0;
function handleSelected(value: number) { selected.value = value; }
</script>
<template>
  <section data-testid="island">
    <Counter :count="count()" @selected="handleSelected" />
    <span>Selected {{ selected }}</span>
    <button :disabled="state === undefined" @click="add(1)">Store {{ count() }}</button>
    <button :disabled="state === undefined" @click="reset()">Reset</button>
  </section>
</template>
