<script setup lang="ts">
import TraceWaterfall from "./TraceWaterfall.rs";
import VueTraceWaterfall from "./VueTraceWaterfall.vue";
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">Vue host + Rust island</p>
      <h1>Trace waterfall triage</h1>
      <p>
        Find the slowest span in a 12,000-span local trace. Each pane owns its own
        filter, zoom, critical-path focus, layout, and measured workload.
      </p>
    </header>
    <div class="comparison">
      <section>
        <h2>Vooya WASM island</h2>
        <TraceWaterfall :spans="12000" />
      </section>
      <section>
        <h2>Vue baseline</h2>
        <VueTraceWaterfall :spans="12000" />
      </section>
    </div>
    <p class="note">
      Measurements are page-local filter/layout/render wall time for this synthetic workload,
      not a claim about production trace-viewer throughput.
    </p>
  </main>
</template>

<style>
:root { color: #17212b; background: #f4f7f8; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; }
main { margin: 0 auto; max-width: 1440px; padding: 40px 24px 64px; }
header { max-width: 780px; }
h1 { font-size: 32px; margin: 8px 0 12px; }
h2 { font-size: 16px; }
.eyebrow { color: #126c67; font-weight: 700; margin: 0; }
.comparison { display: grid; gap: 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.note { color: #52616d; font-size: 14px; line-height: 1.5; }
@media (max-width: 980px) { .comparison { grid-template-columns: 1fr; } }
</style>
