<!-- src/App.svelte -->
<script>
  import { onMount } from "svelte";
  import { api } from "./api.js";

  import Header from "./components/Header.svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import RollForm from "./components/RollForm.svelte";
  import RollList from "./components/RollList.svelte";
  import CameraManager from "./components/CameraManager.svelte";

  let rolls = [];
  let cameras = [];
  let camerasSha = null;

  let loading = false;
  let error = null;

  // 1. 默认起始 ID
  let nextId = "roll_0001";
  let activeTab = "list"; 
  
  // 弹窗与编辑态控制
  let isFormOpen = false;
  let editingRoll = null; // null 表示新建，对象表示正在编辑某卷

  // 2. 倒序排列：提取下划线后的数字进行对比
  function sortRollsDescending(list) {
    return [...list].sort((a, b) => {
      const numA = parseInt((a.id || "").match(/roll_(\d+)/)?.[1] || "0", 10);
      const numB = parseInt((b.id || "").match(/roll_(\d+)/)?.[1] || "0", 10);
      return numB - numA;
    });
  }

  // 3. 计算下一个 ID：取最大值并生成 roll_xxxx 格式
  function calculateNextId() {
    const nums = rolls
      .map(r => parseInt((r.id || "").match(/roll_(\d+)/)?.[1] || "0", 10))
      .filter(n => !isNaN(n));

    const max = nums.length > 0 ? Math.max(...nums) : 0;
    nextId = "roll_" + String(max + 1).padStart(4, "0");
  }

  async function loadAllData() {
    loading = true;
    error = null;
    try {
      const [rollsData, camData] = await Promise.all([
        api.getRolls(),
        api.getCameras()
      ]);
      rolls = sortRollsDescending(rollsData);
      cameras = camData.list || [];
      camerasSha = camData.sha;
      calculateNextId();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  // 打开新建弹窗
  function handleOpenCreate() {
    editingRoll = null;
    isFormOpen = true;
  }

  // 打开编辑弹窗
  function handleOpenEdit(roll) {
    editingRoll = roll;
    isFormOpen = true;
  }

  // 保存（统一处理新建或编辑）
  async function handleSaveRoll(payload) {
    const isEdit = !!editingRoll;

    // 1. 等待 GitHub 真实落库完成，拿到确定的 sha
    const newSha = await api.saveRoll(payload);

    // 2. 确认成功后，再更新前端列表
    if (isEdit) {
      // 编辑：原地替换并赋值最新 sha
      rolls = rolls.map(r => (r.id === payload.id ? { ...payload, _sha: newSha } : r));
    } else {
      // 新建：加入最新 sha 并倒序插入首位
      rolls = [{ ...payload, _sha: newSha }, ...rolls];
      calculateNextId();
    }

    // 3. 清空编辑标记
    editingRoll = null;
  }

  async function handleDeleteRoll(r) {
    if (!confirm(`确定彻底删除 ${r.id} 吗？`)) return;

    const backup = [...rolls];
    rolls = rolls.filter(item => item.id !== r.id);
    calculateNextId();

    try {
      await api.deleteRoll(r.id, r._sha);
    } catch (e) {
      alert("删除失败: " + e.message);
      rolls = backup;
      calculateNextId();
    }
  }

  async function handleUpdateCameras(newList) {
    const backup = [...cameras];
    cameras = newList;
    try {
      camerasSha = await api.saveCameras(newList, camerasSha);
    } catch (e) {
      alert("更新相机库失败: " + e.message);
      cameras = backup;
    }
  }

  onMount(loadAllData);
</script>

<div class="analog-app">
  <Header 
    modeName={api.modeName} 
    bind:activeTab 
    {loading} 
    onRefresh={loadAllData} 
  />

  {#if error}
    <div class="error-banner"><strong>⚠️ 发生异常:</strong> {error}</div>
  {/if}

  {#if activeTab === "dashboard"}
    <Dashboard {rolls} />
  {:else if activeTab === "list"}
    <div class="list-view">
      <div class="list-header">
        <div class="title-wrap">
          <h2>胶卷归档</h2>
          <span class="count-pill">{rolls.length}</span>
        </div>
        <button class="btn-add-roll" on:click={handleOpenCreate} title="录入新胶卷">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>新建</span>
        </button>
      </div>

      <RollList 
        {rolls} 
        onEdit={handleOpenEdit} 
        onDelete={handleDeleteRoll} 
      />
    </div>
  {:else if activeTab === "cameras"}
    <CameraManager {cameras} onUpdate={handleUpdateCameras} />
  {/if}

  <!-- 共享弹窗组件：新增或编辑 -->
  <RollForm 
    bind:isOpen={isFormOpen}
    {nextId} 
    {loading} 
    {cameras} 
    {rolls} 
    initialData={editingRoll} 
    onNavigateToCameras={() => activeTab = "cameras"} 
    onSubmit={handleSaveRoll} 
  />
</div>

<style>
  :global(body) { margin: 0; background-color: #f6f7f6; color: #333333; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .analog-app { max-width: 860px; margin: 0 auto; padding: 20px 16px; box-sizing: border-box; }
  .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .title-wrap { display: flex; align-items: center; gap: 8px; }
  .title-wrap h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827; }
  .count-pill { background: #e5e7eb; color: #4b5563; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; }
  .btn-add-roll { display: flex; align-items: center; gap: 4px; background: #2563eb; color: #ffffff; border: none; padding: 6px 14px 6px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.15s ease; }
  .btn-add-roll:hover { background: #1d4ed8; }
  .error-banner { background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 10px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 16px; }
</style>