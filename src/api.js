// src/api.js
import { createGithubService } from "./githubService.js";

const config = typeof window !== "undefined" ? window.__ANALOG_CONFIG__ : null;
const isLocal = !!(config && config.token);

// 如果是本地，就用用户的明文 config 初始化；否则为 null
const localService = isLocal ? createGithubService(config) : null;

export const api = {
  isLocal,
  modeName: isLocal ? "本地模式 (直连 GitHub)" : "云端模式 (Pages 代理)",

  async getRolls() {
    if (isLocal) return localService.getRolls();
    const res = await fetch("/api/rolls");
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.rolls;
  },

  async saveRoll(payload) {
    if (isLocal) return localService.saveRoll(payload);
    const res = await fetch("/api/rolls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.sha;
  },

  async deleteRoll(id, sha) {
    if (isLocal) return localService.deleteRoll(id, sha);
    const res = await fetch(`/api/rolls?id=${id}&sha=${sha}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async getCameras() {
    if (isLocal) return localService.getCameras();
    const res = await fetch("/api/cameras");
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  async saveCameras(camerasList, sha) {
    if (isLocal) return localService.saveCameras(camerasList, sha);
    const res = await fetch("/api/cameras", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameras: camerasList, sha })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.sha;
  }
};