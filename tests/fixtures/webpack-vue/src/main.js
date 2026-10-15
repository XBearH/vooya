import { createApp, h, ref } from "vue";
import Counter from "./Counter.rs";

const initial = ref(2);
const event = ref("");
const shown = ref(true);

createApp({
  setup() {
    return () =>
      h("main", [
        shown.value
          ? h(Counter, {
              initial: initial.value,
              onChange(value) {
                event.value = String(value);
              },
            })
          : null,
        h("button", { "data-host-update": "", onClick: () => (initial.value += 2) }, "Update"),
        h("button", { "data-host-toggle": "", onClick: () => (shown.value = !shown.value) }, "Toggle"),
        h("output", { "data-event": "" }, event.value),
      ]);
  },
}).mount("#app");
