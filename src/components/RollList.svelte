<!-- src/components/RollList.svelte -->
<script>
  import { pickRootFolder, loadImagesFromSubfolder } from '../fileSystem.js';

  // 状态定义
  let rootHandle = null;             // 用户授权的底片总目录
  let isGalleryOpen = false;         // 画廊弹窗开关
  let currentImages = [];            // 当前查看的照片列表 [{ name, url }]
  let currentFolderTitle = '';       // 当前文件夹名称
  let isLoadingImages = false;       // 加载中提示
  let previewOriginalUrl = null; // 当前放大看的大图

  /**
   * 点击卡片上的“查看扫描件”时触发
   * @param {string} folderName 子文件夹相对路径，如 "roll_0016"
   */

  async function openGallery(folderName) {
    try {
      // 1. 如果用户还没有授权过底片总目录，先引导用户选一次总目录
      if (!rootHandle) {
        alert('请先选择存储所有底片的总根目录（例如 FilmScans 文件夹）');
        rootHandle = await pickRootFolder();
        if (!rootHandle) return;
      }

      isLoadingImages = true;
      currentFolderTitle = folderName;
      isGalleryOpen = true;

      // 2. 顺着根目录导航进子文件夹，读取所有照片
      currentImages = await loadImagesFromSubfolder(rootHandle, folderName);
      
      if (currentImages.length === 0) {
        alert(`未在子目录 "${folderName}" 下找到支持的图片文件（JPG/PNG/BMP）。`);
      }
    } catch (err) {
      console.error('打开画廊失败:', err);
      alert('无法读取目录：' + err.message);
    } finally {
      isLoadingImages = false;
    }
  }

  // 关闭画廊并释放内存中的 Blob URL（防止浏览器内存泄漏）
  function closeGallery() {
    isGalleryOpen = false;
    currentImages.forEach(img => URL.revokeObjectURL(img.url));
    currentImages = [];
  }

  export let rolls = [];
  export let onEdit = (roll) => {};
  export let onDelete = (roll) => {};

</script>

<div class="record-list">
  {#each rolls as r (r.id)}
    {@const validDigi = (r.digitization || []).filter(d => d?.method === 'scanner' || d?.method === 'camera_scan')}
    <div class="record-item">
      <div class="item-info">
        <!-- 1. 编号 + 胶卷 + 画幅 -->
        <div class="item-line1">
          <code class="roll-id-col">{r.id?.replace(/^roll_/, '') || r.id}</code>
          <strong class="film-name-col">
            {`${r.film.brand} - ${r.film.model}` || '未命名胶卷' }
          </strong>
          {#if r.format}
            <span class="format-badge format-{r.format}">{r.format}</span>
          {/if}
        </div>

        <!-- 2. 相机（独立一行） -->
        <div class="item-line card-row">
          <span class="row-icon">📷</span>
          <span class={r.camera ? 'text-main' : 'text-muted'}>
            {r.camera || '未登记相机'}
          </span>
        </div>

        <!-- 3. 日期（独立一行） -->
        <div class="item-line card-row font-mono">
          <span class="row-icon">📅</span>
          {#if r.date?.started}
            <span class="date-text text-main" class:shooting-highlight={!r.date?.finished}>
              {r.date.started} ~ {r.date.finished || '拍摄中'}
            </span>
          {:else}
            <span class="text-muted">未记录日期</span>
          {/if}
        </div>

        <!-- 4. 冲洗工作室与工艺（无数据也保留此行占位） -->
        <div class="item-line card-row">
          <span class="row-icon">🧪</span>
          {#if r.development?.lab && r.development?.process}
            <span class="text-main">
              {r.development.lab} · {r.development.process}
            </span>
          {:else}
            <span class="text-muted">待冲洗</span>
          {/if}
        </div>

        <!-- 5. 数字化方式 -->
        <div class="item-line card-row">
          <span class="row-icon">🔍</span>
          {#if validDigi.length > 0}
            <span class="text-main digi-text-list">
              {#each validDigi as d, index}
                <span class="digi-item">
                  <!-- 2. 精确区分 scanner 与 camera_scan，绝不让空值走翻拍分支 -->
                  {#if d.method === 'scanner'}
                    {d.brand && d.model ? `${d.brand} ${d.model} ${d.folder}` : (d.brand || d.model || '未注明扫描仪')}
                  {:else if d.method === 'camera_scan'}
                    翻拍 ({d.details || '未注明器材'})
                  {/if}
                  <!-- 如果配置了对应文件夹名，显示查看按钮 -->
                  {#if d.folder}
                    <button class="btn-preview" on:click={() => openGallery(d.folder)}>
                      📂 查看扫描件
                    </button>
                  {/if}
                </span>
                {#if index < validDigi.length - 1}
                  <span class="digi-sep">/</span>
                {/if}
              {/each}
            </span>
          {:else}
            <!-- 只要没有有效记录（无论空数组还是全是空字段），一律走这里 -->
            <span class="text-muted">待数字化</span>
          {/if}
        </div>

        <!-- 6. 备注（仅存在时渲染） -->
        {#if r.note}
          <div class="item-note">💬 {r.note}</div>
        {/if}
      </div>

      <!-- 右侧操作栏：编辑与删除 -->
      <div class="item-actions">
        <button class="btn-action btn-edit" on:click={() => onEdit(r)} title="编辑胶卷档案">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>编辑</span>
        </button>
        <button class="btn-action btn-del" on:click={() => onDelete(r)} title="删除胶卷档案">
          ✕
        </button>
      </div>

    </div>
  {/each}
</div>


<!-- 简易底片画廊 Lightbox 弹窗 -->
{#if isGalleryOpen}
  <div class="gallery-backdrop" on:click={closeGallery}>
    <div class="gallery-modal" on:click|stopPropagation>
      <div class="gallery-header">
        <h4>📂 {currentFolderTitle} ({currentImages.length} 张)</h4>
        <button class="btn-close" on:click={closeGallery}>✕</button>
      </div>

      <div class="gallery-body">
        {#if isLoadingImages}
          <div class="gallery-status">正在极速生成高清底片预览...</div>
        {:else}
          <div class="photo-grid">
            {#each currentImages as img}
              <div class="photo-item" on:click={() => (previewOriginalUrl = img.originalUrl)}>
                <!-- 列表只加载 500px 高清缩略图，滚动极其丝滑 -->
                <img src={img.thumbUrl} alt={img.name} loading="lazy" decoding="async" />
                <span class="photo-name">{img.name}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- 点击后的大图全屏预览灯箱 -->
{#if previewOriginalUrl}
  <div class="lightbox-overlay" on:click={() => (previewOriginalUrl = null)}>
    <img src={previewOriginalUrl} alt="原图大图" class="lightbox-img" />
    <span class="lightbox-tip">点击任意处关闭原图</span>
  </div>
{/if}


<style>
  .record-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .record-item {
    background: #ffffff;
    border: 1px solid #e7e9e7;
    padding: 14px 16px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .record-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  /* Line 1: 标题行 */
  .item-line1 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .roll-id-col {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: #334155;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .film-name-col {
    color: #0f172a;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .format-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: monospace;
  }
  .format-135 { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .format-120 { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

  /* Line 2, 3, 4: 固定行高与对齐 */
  .card-row {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    font-size: 0.8rem;
  }

  .row-icon {
    font-size: 0.82rem;
    width: 18px;
    display: inline-block;
    text-align: center;
    flex-shrink: 0;
  }

  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .text-main {
    color: #334155;
  }

  .text-muted {
    color: #94a3b8;
  }

  /* 日期文本基础样式 */
  .date-text {
    padding: 1px 4px;
    border-radius: 4px;
  }

  /* 仅在拍摄中时激活的文字背景高亮（暖黄色微调，与整站色调一致） */
  .shooting-highlight {
    background: #fef3c7;
    color: #92400e;
    font-weight: 600;
  }

  /* Line 5: 数字化行 */
  .digi-text-list {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .digi-item {
    white-space: nowrap;
  }

  .digi-sep {
    color: #cbd5e1;
  }

  /* Note: 醒目凸显 */
  .item-note {
    margin-top: 8px;
    font-size: 0.75rem;
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fde68a;
    padding: 4px 9px;
    border-radius: 4px;
    display: inline-block;
  }

  /* 操作栏按钮 */
  .item-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 14px;
  }

  .btn-action {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .btn-edit {
    color: #4b5563;
    display: flex;
    align-items: center;
    gap: 3px;
    border: 1px solid #e5e7eb;
  }
  .btn-edit:hover { background: #f3f4f6; color: #111827; }

  .btn-del { color: #9ca3af; font-size: 0.95rem; }
  .btn-del:hover { color: #ef4444; background: #fee2e2; }

  .gallery-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 15, 29, 0.85);
    backdrop-filter: blur(8px);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
  }

  .gallery-modal {
    background: #18181b;
    color: #f4f4f5;
    width: 90vw;
    max-width: 1080px;
    height: 85vh;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #27272a;
  }

  .gallery-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }

  .gallery-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .gallery-status {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a1a1aa;
    font-size: 0.9rem;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .photo-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #27272a;
    padding: 8px;
    border-radius: 8px;
  }

  .photo-name {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.72rem;
    color: #a1a1aa;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 开启浏览器高质量缩放降采样，避免底片颗粒走样 */
  .photo-item img {
    width: 100%;
    height: 190px;
    object-fit: cover;
    border-radius: 4px;
    display: block;
    image-rendering: -webkit-optimize-contrast; /* 增强对比度清晰度 */
    image-rendering: high-quality;
    cursor: pointer;
    background: #1e1e24; /* 加载前占位色 */
  }

  .photo-item:hover img {
    opacity: 0.9;
  }

  /* 全屏原图灯箱样式 */
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    z-index: 3000;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: zoom-out;
  }

  .lightbox-img {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  }

  .lightbox-tip {
    position: absolute;
    bottom: 20px;
    color: #94a3b8;
    font-size: 0.8rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px 10px;
    border-radius: 20px;
  }
</style>