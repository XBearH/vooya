<script setup lang="ts">
import Abi from "./Abi.rs";
import Counter from "./Counter.rs";
import { useCart } from "./Store.rs";
import { ref } from "vue";

const { state, add } = useCart();
const cartDetails = (): number => state.value?.totals.item_count ?? 0;
const selected = ref<number | null>(null);
const abiPayload = ref("none");
const abiProps = {
  small: 3,
  precise: 9007199254740993n,
  optional: null,
  pair: [7, "pair"] as [number, string],
  labels: { alpha: 1n, beta: 2n },
};

function addItem() {
  add(1);
}

function handleSelected(value: number) {
  selected.value = value;
}

function handleAbiPayload(value: bigint) {
  abiPayload.value = value.toString();
}
</script>

<template>
  <Abi v-bind="abiProps" @payload="handleAbiPayload" />
  <span class="abi-output">ABI payload {{ abiPayload }}</span>
  <Counter :count="state?.count ?? 0" @selected="handleSelected" />
  <span class="selected">Selected {{ selected }}</span>
  <button class="store-add" @click="addItem">Store {{ state?.count ?? 0 }} / {{ cartDetails() }}</button>
</template>
