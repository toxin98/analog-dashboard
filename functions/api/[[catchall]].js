// functions/api/[[catchall]].js
import { createGithubService } from "../../src/githubService.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. 只处理 /api/rolls 相关的请求
  if (!url.pathname.startsWith("/api/rolls")) {
    return new Response("Not Found", { status: 404 });
  }

  // 2. 用 Cloudflare 后台配置的 Secrets 直接实例化相同的服务
  const service = createGithubService({
    owner: env.GH_OWNER,
    repo: env.GH_REPO,
    token: env.GH_TOKEN,
  });

  try {
    // 3. 直接调用服务里的方法，不需要重复写任何 GitHub API 细节
    if (request.method === "GET") {
      const rolls = await service.getRolls();
      return Response.json({ success: true, rolls });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const sha = await service.saveRoll(body);
      return Response.json({ success: true, sha });
    }

    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      const sha = url.searchParams.get("sha");
      await service.deleteRoll(id, sha);
      return Response.json({ success: true });
    }
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }

  return new Response("Method Not Allowed", { status: 405 });
}