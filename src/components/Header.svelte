<!-- src/components/Header.svelte -->
<script>
  export let modeName = "";
  export let activeTab = "dashboard";
  export let loading = false;
  export let onRefresh = () => {};
</script>

<header class="app-header">
  <div class="brand">
    <h1>胶卷暗房档案库</h1>
    <span class="mode-tag">{modeName}</span>
  </div>

  <div class="header-right">
    <div class="nav-pills">
      <button class:active={activeTab === "dashboard"} on:click={() => activeTab = "dashboard"}>数据看板</button>
      <button class:active={activeTab === "list"} on:click={() => activeTab = "list"}>档案管理</button>
      <button class:active={activeTab === "cameras"} on:click={() => activeTab = "cameras"}>相机管理</button>
    </div>
    <button class="btn-refresh" on:click={onRefresh} disabled={loading}>
      {loading ? "..." : "刷新"}
    </button>
  </div>
</header>

<style>
  .app-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e7e9e7; padding-bottom: 14px; margin-bottom: 20px; }
  .brand h1 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #222; }
  .mode-tag { font-size: 0.7rem; background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .nav-pills { display: flex; background: #e5e7eb; padding: 3px; border-radius: 6px; }
  .nav-pills button { background: transparent; border: none; font-size: 0.8rem; padding: 5px 12px; border-radius: 4px; cursor: pointer; color: #4b5563; }
  .nav-pills button.active { background: #ffffff; color: #111827; font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
  .btn-refresh { background: #ffffff; border: 1px solid #d1d5db; color: #4b5563; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
</style>