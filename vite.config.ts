import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        css: "injected", // 样式直接注入 JS，不需要额外外链 CSS
      },
    }),
  ],
  define: {
    // 兼容 Octokit 等依赖中对 Node 环境常量的探测
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // 关闭模块化预加载标签注入
    modulePreload: false,
    rollupOptions: {
      input: resolve(__dirname, "src/main.js"),
      output: {
        format: "iife", // 核心：打包为纯原生非模块 JS
        name: "AnalogDashboard", // 挂载的全局变量名（非必用，但 IIFE 规范要求提供）
        entryFileNames: "analog-dashboard.js",
        inlineDynamicImports: true, // 强制合入单文件，不拆分 chunk
      },
    },
  },
});