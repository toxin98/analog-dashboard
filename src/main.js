import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app") || document.body;

// Svelte 5 标准挂载方法，杜绝 effect_orphan
const app = mount(App, {
  target,
});

export default app;