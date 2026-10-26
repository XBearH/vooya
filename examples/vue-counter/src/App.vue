<script setup lang="ts">
import { ref } from "vue";
import Counter from "./Counter.rs";
import FailMount from "./FailMount.rs";
import LoopEvents from "./LoopEvents.rs";
import ProtocolEvents from "./ProtocolEvents.rs";

const initial = ref(1);
const lastChange = ref<number>();
const visible = ref(true);
const selected = ref<number>();
const protocolVisible = ref(true);
const protocol = ref<string>();
const mountError = ref<string>();
const failedPing = ref(false);
const failedVisible = ref(false);

function receiveMany(index: number, enabled: boolean, label: string) {
  protocol.value = `many:${index}:${enabled}:${label}`;
}
</script>

<template>
  <main>
    <h1>Vooya inside Vue</h1>
    <Counter
      v-if="visible"
      :initial="initial"
      class="counter-host"
      @change="lastChange = $event"
    />
    <p>Vue received: {{ lastChange ?? "no event" }}</p>
    <button @click="initial = 10">Set Vue prop to 10</button>
    <button @click="initial = 11">Set Vue prop to 11</button>
    <button @click="visible = !visible">Toggle Vooya island</button>
    <LoopEvents @choose="selected = $event" />
    <p>Vue loop event: {{ selected ?? "no event" }}</p>
    <ProtocolEvents
      v-if="protocolVisible"
      class="protocol-host"
      @zero="protocol = 'zero'"
      @one="protocol = `one:${$event}`"
      @many="receiveMany"
    />
    <p>Vue protocol event: {{ protocol ?? "no event" }}</p>
    <button @click="protocolVisible = !protocolVisible">Toggle protocol island</button>
    <button @click="failedVisible = true">Mount failing island</button>
    <FailMount v-if="failedVisible" class="failed-host" @error="mountError = $event.stage" @ping="failedPing = true" />
    <p>Vue failed mount: {{ mountError ?? "no error" }}</p>
    <p>Vue failed mount ping: {{ failedPing ? "received" : "none" }}</p>
  </main>
</template>

<style>
main { font-family: system-ui, sans-serif; margin: 2rem; }
.counter-host { margin-block: 1rem; }
</style>
