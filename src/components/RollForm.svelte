<!-- src/components/RollForm.svelte -->
<script>
  import { filmDict, scannerDict } from '../catalog.js';

  export let isOpen = false;
  export let nextId = "";
  export let cameras = [];
  export let rolls = [];
  export let initialData = null;
  export let onClose = () => {};
  export let onSubmit = async (payload) => {}; // 改为支持 async

  $: isEditMode = !!initialData;
  $: currentRollId = isEditMode ? initialData.id : nextId;

  // 过滤可用相机
  $: activeCameras = cameras.filter(c => !c.archived || (isEditMode && c.name === initialData?.camera));
  // 提取历史实验室
  $: availableLabs = Array.from(new Set(rolls.map(r => r.development?.lab).filter(Boolean)));

  // 打平胶卷库供 Row 1 模糊搜索
  const allFilms = Object.entries(filmDict).flatMap(([brand, models]) =>
    models.map(model => ({ brand, model, label: `${brand} - ${model}` }))
  );

  let filmSearchQuery = '';
  let isFilmDropdownOpen = false;

  $: filteredFilms = filmSearchQuery.trim()
    ? allFilms.filter(f => f.label.toLowerCase().includes(filmSearchQuery.toLowerCase()))
    : allFilms;

  const emptyForm = () => ({
    film: { brand: "", model: "" },
    format: "",
    camera: "",
    date: { started: "", finished: "" },
    development: { lab: "", process: "" },
    digitization: [],
    note: ""
  });

  let form = emptyForm();
  let validationError = "";
  let isSubmitting = false; // 本地提交中状态

  // 1. 纯函数：仅基于外部传入的 initialData 装配，绝不依赖或读取已有 form
  function loadFormData(data) {
    if (data) {
      form = {
        film: {
          brand: data.film.brand || '',
          model: data.film.model || ''
        },
        format: data.format || '',
        camera: data.camera || '',
        date: {
          started: data.date.started || '',
          finished: data.date.finished || ''
        },
        development: {
          lab: data.development?.lab || '',
          process: data.development?.process || ''
        },
        digitization: (data.digitization || []).filter(d => d?.method).map(d => ({ ...d })),
        note: data.note || ''
      };
      // 直接从 data 取值，绝不从 form 取值！
      filmSearchQuery = data.film?.brand && data.film?.model
        ? `${data.film.brand} - ${data.film.model}`
        : '';
    } else {
      form = emptyForm();
      filmSearchQuery = '';
    }
  }

  // 2. 避免时序竞争：使用独立标记感知打开瞬间与数据变化
  let lastLoadedData = undefined;
  let prevIsOpen = false;

  $: if (isOpen) {
    if (isOpen || initialData !== lastLoadedData) {
      lastLoadedData = initialData;
      validationError = '';
      isSubmitting = false;
      isFilmDropdownOpen = false;
      loadFormData(initialData);
    } else {
      lastLoadedData = undefined;
    }
  }
  $: prevIsOpen = isOpen;


  // 胶卷选择
  function handleFilmInput(e) {
    filmSearchQuery = e.target.value;
    isFilmDropdownOpen = true;
    form.film.brand = '';
    form.film.model = '';
  }

  function selectFilm(item) {
    form.film.brand = item.brand;
    form.film.model = item.model;
    filmSearchQuery = item.label;
    isFilmDropdownOpen = false;
  }

  // 数字化版本管理
  function addDigitization() {
    form.digitization = [
      ...form.digitization,
      { method: 'scanner', brand: '', model: '' }
    ];
  }

  function removeDigitization(index) {
    form.digitization = form.digitization.filter((_, i) => i !== index);
  }

  function handleMethodChange(item) {
    if (item.method === 'scanner') {
      delete item.details;
      item.brand = '';
      item.model = '';
    } else {
      delete item.brand;
      delete item.model;
      item.details = '';
    }
  }

  function handleClose() {
    // 1. 如果正在提交，绝对禁止关闭和清空表单
    if (isSubmitting) return;

    // 2. 正常关闭流程：同步状态并清理
    isOpen = false;
    validationError = "";
    isFilmDropdownOpen = false;
    filmSearchQuery = '';
    form = emptyForm();

    // 如果父级传入了 onClose（比如用来顺便清空 editingRoll），也可以顺带触发
    if (onClose) onClose();
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen && !isSubmitting) {
      handleClose();
    }
  }

  // 监听冲洗店：如果把冲洗店删空了，联动清空工艺
  $: if (!form.development.lab?.trim()) {
    form.development.process = '';
  }

  async function handleSubmit() {
    validationError = "";

    if (!form.film.brand || !form.film.model) {
      validationError = "请填写胶卷型号（必填）";
      return;
    }
    if (!form.format) {
      validationError = "请选择画幅规格（必选）";
      return;
    }
    if (!form.camera) {
      validationError = "请在下拉菜单中选择相机（必填）";
      return;
    }
    if (!form.date.started) {
      validationError = "请选择装机日期（必填）";
      return;
    }
    if (form.development.lab.trim() && !form.development.process.trim()) {
      validationError = "填写了冲洗工作室后，冲洗工艺为必填项";
      return;
    }

    // 校验每个数字化项
    for (let i = 0; i < form.digitization.length; i++) {
      const d = form.digitization[i];
      if (d.method === 'scanner' && (!d.brand || !d.model)) {
        validationError = `第 ${i + 1} 个数字化记录未选全扫描仪品牌与型号`;
        return;
      }
    }

    const payload = {
      id: currentRollId,
      film: {
        brand: form.film.brand,
        model: form.film.model
      },
      format: form.format,
      camera: form.camera,
      date: {
        started: form.date.started,
        finished: form.date.finished || ""
      },
      development: {
        lab: form.development.lab.trim(),
        process: form.development.process.trim()
      },
      digitization: form.digitization.map(d => 
        d.method === 'scanner'
          ? { method: 'scanner', brand: d.brand, model: d.model }
          : { method: 'camera_scan', details: (d.details || '').trim() }
      ),
      note: form.note.trim(),
      updated: new Date().toISOString(),
      ...(isEditMode && initialData?._sha ? { _sha: initialData._sha } : {})
    };

     try {
      isSubmitting = true;
      // 2. 等待远端网络请求
      await onSubmit(payload);

      // 3. 【成功分支】：只有远端写入成功，才清空表单并关闭弹窗
      isSubmitting = false;
      handleClose();
    } catch (err) {
      // 4. 【失败分支】：
      // 停留在弹窗内部，原封不动保留用户当前输入的内容，仅更新错误提示文案
      isSubmitting = false;
      validationError = `保存失败：${err.message || err}`;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-left">
          <h3>{isEditMode ? '编辑胶卷档案' : '录入新胶卷'}</h3>
          <code class="next-id">{currentRollId}</code>
        </div>
        {#if !isSubmitting}
          <button class="btn-close" on:click={handleClose}>✕</button>
        {/if}
      </div>

      {#if validationError}
        <div class="warn-box">⚠️ {validationError}</div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <!-- 前置字段统一双列网格 -->
        <div class="grid-2col">
          <!-- 1. 胶卷检索 -->
          <div class="autocomplete-wrapper">
            <label for="film-input">胶卷型号 <span class="req">*</span></label>
            <input
              id="film-input"
              type="text"
              autocomplete="off"
              placeholder="输入型号检索（如 5219 或 Portra）"
              value={filmSearchQuery}
              on:input={handleFilmInput}
              on:focus={() => (isFilmDropdownOpen = true)}
              on:blur={() => setTimeout(() => (isFilmDropdownOpen = false), 200)}
              disabled={isSubmitting}
              required
            />
            {#if isFilmDropdownOpen && filteredFilms.length > 0}
              <ul class="suggestions-list">
                {#each filteredFilms as item}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                  <li on:click={() => selectFilm(item)}>
                    <span class="brand-name">{item.brand}</span>
                    <span class="sep">-</span>
                    <span class="model-name">{item.model}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <!-- 2. 画幅 -->
          <div>
            <label for="format-select">画幅 <span class="req">*</span></label>
            <select id="format-select" bind:value={form.format} disabled={isSubmitting} required>
              <option value="135">135</option>
              <option value="120">120</option>
            </select>
          </div>

          <!-- 3. 相机 -->
          <div>
            <label for="camera-select">相机 <span class="req">*</span></label>
            <select id="camera-select" bind:value={form.camera} disabled={isSubmitting} required>
              <option value="" disabled selected>选择机身</option>
              {#each activeCameras as cam}
                <option value={cam.name}>{cam.name}</option>
              {/each}
            </select>
          </div>

          <!-- 4. 开始拍摄日期 -->
          <div>
            <label for="date-started">开始拍摄 <span class="req">*</span></label>
            <input id="date-started" type="date" bind:value={form.date.started} disabled={isSubmitting} required />
          </div>

          <!-- 5. 结束拍摄日期 -->
          <div>
            <label for="date-finished">结束拍摄</label>
            <input id="date-finished" type="date" bind:value={form.date.finished} disabled={isSubmitting} />
          </div>

          <!-- 6. 冲洗工作室 -->
          <div class="col-start">
            <label for="lab-input">冲洗工作室</label>
            <input
              id="lab-input"
              bind:value={form.development.lab}
              list="lab-options"
              placeholder="如：XX工作室 / 自冲"
              disabled={isSubmitting}
            />
            <datalist id="lab-options">
              {#each availableLabs as lab}<option value={lab}></option>{/each}
            </datalist>
          </div>

          <!-- 7. 冲洗工艺 -->
          <div>
            <label for="process-input">
              冲洗工艺 
              {#if form.development.lab.trim()}
                <span class="req">*</span>
              {/if}
            </label>
            <input
              id="process-input"
              bind:value={form.development.process}
              placeholder={form.development.lab.trim() ? "如：C-41 / ECN-2 / Custom" : "请先填写冲洗店"}
              disabled={!form.development.lab.trim() || isSubmitting}
              required={!!form.development.lab.trim()}
            />
            </div>
          </div>

        <!-- 全宽：底片数字化 -->
        <div class="digitization-section">
          <div class="section-title">
            <span class="sec-label">底片数字化</span>
            <button type="button" class="btn-add-tag" on:click={addDigitization} disabled={isSubmitting}>
              + 增加数字化版本
            </button>
          </div>

          {#if form.digitization.length === 0}
            <div class="empty-digi-hint">尚未数字化（未冲扫状态）</div>
          {:else}
            <div class="digitization-list">
              {#each form.digitization as item, index}
                <div class="digitization-row">
                  <!-- 序号徽章 -->
                  <span class="row-index">#{index + 1}</span>

                  <select
                    class="field-method"
                    bind:value={item.method}
                    on:change={() => handleMethodChange(item)}
                    disabled={isSubmitting}
                  >
                    <option value="scanner">扫描仪</option>
                    <option value="camera_scan">翻拍</option>
                  </select>

                  {#if item.method === 'scanner'}
                    <select
                      class="field-scanner-brand"
                      bind:value={item.brand}
                      on:change={() => (item.model = '')}
                      disabled={isSubmitting}
                      required
                    >
                      <option value="" disabled selected>品牌</option>
                      {#each Object.keys(scannerDict) as b}
                        <option value={b}>{b}</option>
                      {/each}
                    </select>

                    <select
                      class="field-scanner-model"
                      bind:value={item.model}
                      disabled={!item.brand || isSubmitting}
                      required
                    >
                      <option value="" disabled selected>{item.brand ? '选择型号' : '先选品牌'}</option>
                      {#each (scannerDict[item.brand] || []) as m}
                        <option value={m}>{m}</option>
                      {/each}
                    </select>
                  {:else}
                    <input
                      class="field-camera-details"
                      bind:value={item.details}
                      placeholder="翻拍设备/参数（选填，如：Sony A7R3 + 90微）"
                      disabled={isSubmitting}
                    />
                  {/if}

                  <button
                    type="button"
                    class="btn-del"
                    on:click={() => removeDigitization(index)}
                    disabled={isSubmitting}
                    title="删除该记录"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- 全宽：备注 -->
        <div class="note-section">
          <label for="note-input">档案备注</label>
          <input
            id="note-input"
            bind:value={form.note}
            placeholder="记录镜头使用、曝光偏置、拍摄地点等"
            disabled={isSubmitting}
          />
        </div>

        <!-- 底部操作按钮 -->
        <div class="modal-footer">
          <button type="button" class="btn-cancel" on:click={handleClose} disabled={isSubmitting}>取消</button>
          <button type="submit" class="btn-submit" disabled={isSubmitting || activeCameras.length === 0}>
            {isSubmitting ? '正在写入...' : (isEditMode ? '保存修改' : '写入档案库')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }

  .modal-card {
    background: #ffffff;
    width: 100%;
    max-width: 580px;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    max-height: 92vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafafa;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #0f172a;
  }

  .next-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
    background: #e2e8f0;
    color: #334155;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: 600;
  }

  .btn-close {
    background: transparent;
    border: none;
    font-size: 1.15rem;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
  }

  form {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .warn-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    margin: 12px 20px 0 20px;
  }

  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #475569;
    margin-bottom: 5px;
  }

  .req { color: #ef4444; margin-left: 2px; }

  input, select {
    width: 100%;
    height: 38px;
    padding: 0 10px;
    font-size: 0.85rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  /* 始终双列排列，永不换行折叠 */
  .grid-2col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
  }

  .col-start {
    grid-column-start: 1;
  }

  /* 数字化与备注独占全宽 */
  .digitization-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    width: 100%;
    box-sizing: border-box;
  }

  .note-section {
    width: 100%;
    box-sizing: border-box;
  }

  /* 确保网格内的 input/select 在极端小屏下也能自适应收缩 */
  .grid-2col input,
  .grid-2col select {
    min-width: 0;
    width: 100%;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .sec-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #334155;
  }

  .btn-add-tag {
    background: transparent;
    border: 1px dashed #94a3b8;
    color: #2563eb;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-add-tag:hover {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .empty-digi-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    padding: 6px 0;
  }

  .digitization-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .digitization-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .row-index {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    background: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;
  }

  .field-method { width: 90px; flex-shrink: 0; }
  .field-scanner-brand { width: 110px; flex-shrink: 0; }
  .field-scanner-model, .field-camera-details { flex: 1; }

  .digitization-row select,
  .digitization-row input {
    height: 34px;
  }

  .btn-del {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px 6px;
    font-size: 0.85rem;
    line-height: 1;
  }

  .btn-del:hover { color: #ef4444; }

  /* 胶卷 Combobox 浮层 */
  .autocomplete-wrapper {
    position: relative;
  }

  .suggestions-list {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    max-height: 190px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    margin: 0;
    padding: 4px 0;
    list-style: none;
    z-index: 50;
  }

  .suggestions-list li {
    padding: 8px 12px;
    font-size: 0.82rem;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .suggestions-list li:hover {
    background: #eff6ff;
  }

  .brand-name { font-weight: 600; color: #1e293b; }
  .sep { color: #94a3b8; }
  .model-name { color: #475569; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }

  .btn-cancel {
    height: 36px;
    padding: 0 14px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    color: #475569;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-submit {
    height: 36px;
    padding: 0 18px;
    background: #2563eb;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-submit:hover:not(:disabled) { background: #1d4ed8; }
  .btn-submit:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
</style>