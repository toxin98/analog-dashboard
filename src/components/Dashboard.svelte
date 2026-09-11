<!-- src/Dashboard.svelte -->
<script>
  export let rolls = [];

  const PALETTE = [
    "#ea4335", "#fbbc05", "#34a853", "#4285f4",
    "#9061f9", "#374151", "#e02424", "#059669",
    "#d97706", "#2563eb", "#4b5563"
  ];

  // 聚合函数
  function countBy(arr, keyExtractor) {
    const map = {};
    for (const item of arr) {
      const key = keyExtractor(item) || "自冲 / 未知";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // 数据衍生
  $: totalRolls = rolls.length;
  $: filmStats = countBy(rolls, r => r.film);
  $: cameraStats = countBy(rolls, r => r.camera).slice(0, 6);
  $: labStats = countBy(rolls, r => r.development?.lab).slice(0, 6);

  // 1. 环形图（SVG Path 计算）
  $: donutSegments = (() => {
    if (!totalRolls) return [];
    let accumulatedAngle = 0;
    const cx = 100, cy = 100, rOuter = 85, rInner = 45;

    return filmStats.map((item, idx) => {
      const angle = (item.count / totalRolls) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle += angle;

      const toRad = deg => (deg - 90) * (Math.PI / 180);
      const x1 = cx + rOuter * Math.cos(toRad(startAngle));
      const y1 = cy + rOuter * Math.sin(toRad(startAngle));
      const x2 = cx + rOuter * Math.cos(toRad(endAngle));
      const y2 = cy + rOuter * Math.sin(toRad(endAngle));

      const ix1 = cx + rInner * Math.cos(toRad(endAngle));
      const iy1 = cy + rInner * Math.sin(toRad(endAngle));
      const ix2 = cx + rInner * Math.cos(toRad(startAngle));
      const iy2 = cy + rInner * Math.sin(toRad(startAngle));

      const largeArc = angle > 180 ? 1 : 0;
      const d = `
        M ${x1} ${y1}
        A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
        L ${ix1} ${iy1}
        A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix2} ${iy2}
        Z
      `;
      return {
        d,
        color: PALETTE[idx % PALETTE.length],
        name: item.name,
        count: item.count
      };
    });
  })();

  // 2. 纵向柱状图参数
  $: maxCameraCount = Math.max(4, ...cameraStats.map(c => c.count));
</script>

<div class="dashboard-wrapper">
  <!-- 顶部统计条 -->
  <div class="total-banner">
    已累计拍摄归档: <strong>{totalRolls}</strong> 卷
  </div>

  <div class="grid-layout">
    <!-- 卡片 1: 常用胶卷型号 (环形图) -->
    <div class="chart-card">
      <h3 class="chart-title">常用胶卷型号</h3>
      <div class="legend-box">
        {#each filmStats.slice(0, 7) as item, i}
          <div class="legend-item">
            <span class="legend-color" style="background-color: {PALETTE[i % PALETTE.length]};"></span>
            <span class="legend-label" title={item.name}>{item.name}</span>
          </div>
        {/each}
      </div>
      <div class="donut-container">
        <svg viewBox="0 0 200 200" class="donut-svg">
          {#each donutSegments as segment}
            <path d={segment.d} fill={segment.color} stroke="#ffffff" stroke-width="2" />
          {/each}
        </svg>
      </div>
    </div>

    <!-- 卡片 2: 主力机身使用频次 (柱状图) -->
    <div class="chart-card">
      <h3 class="chart-title">主力机身使用频次</h3>
      <div class="bar-chart-container">
        <svg viewBox="0 0 320 220" class="chart-svg">
          <!-- 背景横线与 Y 轴刻度 -->
          {#each [4, 3, 2, 1, 0] as tick}
            {@const y = 30 + (4 - tick) * 35}
            <line x1="45" y1={y} x2="310" y2={y} stroke="#eeeeee" stroke-width="1" />
            <text x="35" y={y + 4} text-anchor="end" class="tick-label">{tick}</text>
          {/each}
          
          <line x1="45" y1="170" x2="310" y2="170" stroke="#e0e0e0" stroke-width="1" />

          <!-- 柱子与 X 轴倾斜文字 -->
          {#each cameraStats as cam, i}
            {@const barWidth = 26}
            {@const barHeight = (cam.count / 4) * 140}
            {@const x = 60 + i * 44}
            {@const y = 170 - barHeight}
            <rect x={x} y={y} width={barWidth} height={barHeight} fill="#2c3440" rx="1" />
            <text
              x={x + 10}
              y="185"
              transform="rotate(-35, {x + 10}, 185)"
              class="axis-label"
              text-anchor="end"
            >
              {cam.name}
            </text>
          {/each}
        </svg>
      </div>
    </div>

    <!-- 卡片 3: 冲洗实验室 (水平条形图) -->
    <div class="chart-card">
      <h3 class="chart-title">冲洗实验室</h3>
      <div class="hbar-chart-container">
        <svg viewBox="0 0 320 200" class="chart-svg">
          <!-- 纵向网格线与 X 轴刻度 (0, 1, 2, 3) -->
          {#each [0, 1, 2, 3] as tick}
            {@const x = 110 + tick * 60}
            <line x1={x} y1="15" x2={x} y2="165" stroke="#eeeeee" stroke-width="1" />
            <text x={x} y="180" text-anchor="middle" class="tick-label">{tick}</text>
          {/each}

          <line x1="110" y1="15" x2="110" y2="165" stroke="#e0e0e0" stroke-width="1" />

          <!-- 水平条形与 Y 轴文字 -->
          {#each labStats as lab, i}
            {@const barY = 22 + i * 24}
            {@const barWidth = (lab.count / 3) * 180}
            <text x="102" y={barY + 11} text-anchor="end" class="axis-label-hbar">{lab.name}</text>
            <rect x="110" y={barY} width={barWidth} height="15" fill="#525c6a" rx="1" />
          {/each}
        </svg>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-wrapper {
    background-color: #f6f7f6;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* 顶部横幅 */
  .total-banner {
    background: #ffffff;
    border: 1px solid #e7e9e7;
    border-radius: 8px;
    padding: 14px 20px;
    font-size: 1.1rem;
    color: #333333;
    margin-bottom: 16px;
  }
  .total-banner strong {
    font-size: 1.35rem;
    color: #000000;
  }

  /* 栅格排版 */
  .grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }

  /* 统一卡片 */
  .chart-card {
    background: #ffffff;
    border: 1px solid #e7e9e7;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
  }

  .chart-title {
    margin: 0 0 14px 0;
    text-align: center;
    font-size: 1rem;
    font-weight: 700;
    color: #594f4f;
  }

  /* 图例 */
  .legend-box {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 12px;
    min-height: 48px;
    margin-bottom: 8px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    color: #555555;
  }
  .legend-color {
    width: 24px;
    height: 8px;
    margin-right: 6px;
    border-radius: 1px;
  }
  .legend-label {
    max-width: 110px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 图表容器 */
  .donut-container {
    width: 100%;
    max-width: 180px;
    margin: 0 auto;
  }
  .donut-svg, .chart-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .tick-label {
    font-size: 11px;
    fill: #777777;
  }
  .axis-label {
    font-size: 11px;
    fill: #555555;
  }
  .axis-label-hbar {
    font-size: 11px;
    fill: #555555;
  }
</style>