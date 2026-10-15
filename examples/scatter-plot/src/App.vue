<script setup lang="ts">
import { ref } from "vue";
import RustScatterPlot from "./RustScatterPlot.rs";

const points = ref(150_000);
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">Vue host + Rust island</p>
      <h1>150,000 point scatter plot</h1>
      <p class="intro">
        Vue owns this page and its input. The <code>.rs</code> component owns point generation,
        canvas rendering, and zooming inside its DOM subtree.
      </p>
    </header>

    <label class="point-control">
      Points
      <input v-model.number="points" type="range" min="50000" max="200000" step="10000" />
      <output>{{ points.toLocaleString() }}</output>
    </label>

    <RustScatterPlot :points="points" />
  </main>
</template>

<style>
:root { color: #17212b; background: #f4f7f8; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; }
main { margin: 0 auto; max-width: 1100px; padding: 48px 24px 64px; }
header { max-width: 720px; }
h1 { font-size: 32px; margin: 8px 0 12px; }
.eyebrow { color: #126c67; font-weight: 700; margin: 0; }
.intro { color: #52616d; line-height: 1.6; }
.point-control { align-items: center; display: flex; gap: 12px; margin: 28px 0 16px; }
.point-control input { accent-color: #126c67; flex: 1; max-width: 340px; }
.point-control output { font-variant-numeric: tabular-nums; min-width: 80px; }
@media (max-width: 600px) { main { padding: 28px 16px; } h1 { font-size: 28px; } .point-control { align-items: flex-start; flex-direction: column; } }
</style>
