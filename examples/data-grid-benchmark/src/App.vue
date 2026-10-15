<script setup lang="ts">
import VooyaGrid from "./VooyaGrid.rs";
import VueGrid from "./VueGrid.vue";
</script>

<template>
  <main>
    <h1>100,000 row local data grid</h1>
    <p>Both panes filter, score-sort, and virtualize the same generated data.</p>
    <div class="benchmark-grid">
      <section>
        <h2>Vooya WASM island</h2>
        <VooyaGrid :rows="100_000" />
      </section>
      <section>
        <h2>Vue baseline</h2>
        <VueGrid />
      </section>
    </div>
  </main>
</template>

<style>
body { margin: 0; }
main { font-family: system-ui, sans-serif; margin: 2rem; }
.benchmark-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.benchmark-grid h2 { font-size: 1rem; }
.vooya-grid-toolbar, .grid-toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.vooya-grid-viewport, .grid-viewport { height: 320px; overflow-y: auto; position: relative; border: 1px solid #ccd3d9; }
.vooya-grid-rows, .grid-rows { left: 0; position: absolute; right: 0; top: 0; }
.vooya-grid-row, .grid-row { display: grid; grid-template-columns: 1fr 6rem; height: 28px; line-height: 28px; padding: 0 0.5rem; }
.vooya-grid-row:nth-child(odd), .grid-row:nth-child(odd) { background: #f2f5f7; }
@media (max-width: 800px) { .benchmark-grid { grid-template-columns: 1fr; } }
</style>
