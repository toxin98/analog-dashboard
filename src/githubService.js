// src/githubService.js

function toBase64(str) {
  return typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(str)))
    : Buffer.from(str).toString("base64");
}

export function createGithubService({ owner, repo, token }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    "User-Agent": "analog-dashboard",
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
  };

  return {
    // 1. 获取胶卷
    async getRolls() {
      let res = await fetch(`${base}/contents/rolls`, { headers });

      if (res.status === 404) return [];

      if (!res.ok) throw new Error(`GitHub 错误: ${res.statusText}`);

      const files = await res.json();
      if (!Array.isArray(files)) return [];

      const jsonFiles = files.filter(f => f.name.endsWith(".json"));

      const rolls = await Promise.all(
        jsonFiles.map(async f => {
          const raw = await fetch(f.download_url).then(r => r.json());
          return { ...raw, _sha: f.sha };
        })
      );
      return rolls
    },

    // 2. 保存胶卷
    async saveRoll(payload) {
      // 1. 把 _sha 提出来给请求头使用，剩下的 cleanData 才是真正写入文件的纯净 JSON
      const { _sha, ...cleanData } = payload;

      const content = toBase64(JSON.stringify(cleanData, null, 2));
      
      // 2. 将 Commit 提示信息规范为 Update xxxx.json
      const fileName = `${cleanData.id}.json`;
      const bodyData = {
        message: _sha ? `Update ${fileName}` : `Add ${fileName}`,
        content
      };

      // 2. 如果存在 _sha，交给 GitHub 作为验证参数
      if (_sha) {
        bodyData.sha = _sha;
      }

      const res = await fetch(`${base}/contents/rolls/${fileName}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "保存失败");

      // 3. 把写入后 GitHub 产生的新 sha 返回给前端内存继续暂存
      return data.content.sha;
    },

    // 3. 删除胶卷
    async deleteRoll(id, sha) {
      const fileName = `${id}.json`;
      const res = await fetch(`${base}/contents/rolls/${fileName}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          message: `Delete ${fileName}`,
          sha
        }),
      });
      if (!res.ok) throw new Error("删除失败");
      return true;
    },

    // 1. 读取相机列表
    async getCameras() {
      const res = await fetch(`${base}/contents/cameras.json`, { headers });
      
      // 404 说明用户从未添加过相机，直接返回空列表与 null sha
      if (res.status === 404) {
        return { list: [], sha: null };
      }
      
      if (!res.ok) throw new Error("获取相机列表失败");
      
      const data = await res.json();
      const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
      return { list: content, sha: data.sha };
    },

    // 2. 覆盖保存相机列表
    async saveCameras(camerasList, sha = null) {
      const content = toBase64(JSON.stringify(camerasList, null, 2));
      const payload = {
        message: "Update cameras.json",
        content
      };
      if (sha) payload.sha = sha;

      const res = await fetch(`${base}/contents/cameras.json`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "更新相机列表失败");
      return data.content.sha;
    }
  };
}