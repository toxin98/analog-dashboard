<!-- src/components/CameraManager.svelte -->
<script>
  export let cameras = [];
  export let onUpdate = (list) => {};

  let newName = "";

  function addCamera() {
    if (!newName.trim()) return;
    const updated = [
      ...cameras,
      { id: "cam-" + Date.now(), name: newName.trim(), archived: false }
    ];
    newName = "";
    onUpdate(updated);
  }

  function toggleArchive(id) {
    const updated = cameras.map(c => 
      c.id === id ? { ...c, archived: !c.archived } : c
    );
    onUpdate(updated);
  }

  function removeCamera(id) {
    if (!confirm("确定从资产列表删除该机身吗？")) return;
    const updated = cameras.filter(c => c.id !== id);
    onUpdate(updated);
  }

  $: activeCameras = cameras.filter(c => !c.archived);
  $: archivedCameras = cameras.filter(c => c.archived);
</script>

<div class="camera-card">
  <div class="header">
    <h3>📷 我的防潮箱设备</h3>
  </div>

  <div class="add-row">
    <input bind:value={newName} placeholder="输入新购入相机型号 (如 Leica M6)" />
    <button on:click={addCamera} class="btn-add">添加入库</button>
  </div>

  <!-- 现役设备 -->
  <div class="sec-title">现役在手机身 ({activeCameras.length})</div>
  <ul class="cam-list">
    {#each activeCameras as cam}
      <li>
        <span class="cam-name">{cam.name}</span>
        <div class="actions">
          <button class="btn-text" on:click={() => toggleArchive(cam.id)}>标记已转手</button>
          <button class="btn-del" on:click={() => removeCamera(cam.id)}>✕</button>
        </div>
      </li>
    {:else}
      <p class="empty-tip">暂无现役相机，请在上方添加</p>
    {/each}
  </ul>

  <!-- 已归档设备 -->
  {#if archivedCameras.length > 0}
    <div class="sec-title opt">已转手 / 归档机身 ({archivedCameras.length})</div>
    <ul class="cam-list archived">
      {#each archivedCameras as cam}
        <li>
          <span class="cam-name">{cam.name}</span>
          <div class="actions">
            <button class="btn-text" on:click={() => toggleArchive(cam.id)}>恢复为现役</button>
            <button class="btn-del" on:click={() => removeCamera(cam.id)}>✕</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .camera-card { background: #ffffff; border: 1px solid #e7e9e7; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
  .header h3 { margin: 0 0 12px 0; font-size: 0.95rem; color: #111827; }
  .add-row { display: flex; gap: 8px; margin-bottom: 16px; }
  .add-row input { flex: 1; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
  .btn-add { background: #111827; color: #ffffff; border: none; padding: 0 16px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
  
  .sec-title { font-size: 0.75rem; font-weight: 700; color: #4b5563; margin: 12px 0 6px 0; }
  .sec-title.opt { color: #9ca3af; margin-top: 18px; }
  
  .cam-list { list-style: none; padding: 0; margin: 0; }
  .cam-list li { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; }
  .cam-list.archived li { color: #9ca3af; }
  .cam-name { font-weight: 500; }
  
  .actions { display: flex; align-items: center; gap: 8px; }
  .btn-text { background: transparent; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; color: #6b7280; cursor: pointer; }
  .btn-text:hover { background: #f3f4f6; }
  .btn-del { background: transparent; border: none; color: #d1d5db; cursor: pointer; padding: 2px 4px; font-size: 0.85rem; }
  .btn-del:hover { color: #ef4444; }
  .empty-tip { font-size: 0.75rem; color: #9ca3af; margin: 4px 0; }
</style>