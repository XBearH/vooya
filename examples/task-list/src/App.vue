<script setup lang="ts">
import TaskList from "./TaskList.rs";
</script>

<template>
  <main>
    <h1>Vooya task list inside Vue</h1>
    <TaskList />
  </main>
</template>

<style>
main { font-family: system-ui, sans-serif; margin: 2rem; max-width: 42rem; }
.vooya-task-compose, .vooya-task-filters, .vooya-task-row { display: flex; gap: .5rem; margin-block: .5rem; }
.vooya-task-compose input { flex: 1; }
.vooya-task-row span { flex: 1; }
.vooya-task-row.is-done span { text-decoration: line-through; }
[data-vooya-error] { color: #a01414; min-height: 1.2rem; }
</style>
