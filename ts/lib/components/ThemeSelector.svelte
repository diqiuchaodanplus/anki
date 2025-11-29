<script lang="ts">
  import { themeMode, type ThemeMode } from "$lib/sveltelib/theme";
  import { onMount } from "svelte";
  import { get } from "svelte/store";

  let current: ThemeMode = get(themeMode);

  function setMode(m: ThemeMode) {
    themeMode.set(m);
    current = m;
  }

  const options: { value: ThemeMode; label: string }[] = [
    { value: "system", label: "系统（跟随应用/系统）" },
    { value: "light", label: "亮色" },
    { value: "dark", label: "暗色" },
  ];

  onMount(() => {
    // keep local state in sync if something else changes themeMode
    const unsub = themeMode.subscribe((m) => (current = m));
    return unsub;
  });
</script>

<style>
  .theme-select { display:inline-flex; align-items:center; gap:8px; }
  select { padding:4px 8px; }
</style>

<div class="theme-select" role="group" aria-label="主题选择">
  <label for="theme-select">主题:</label>
  <select id="theme-select" bind:value={current} on:change={(e) => setMode(current)}>
    {#each options as o}
      <option value={o.value}>{o.label}</option>
    {/each}
  </select>
</div>
