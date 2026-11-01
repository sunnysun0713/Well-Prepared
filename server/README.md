# NeZha 同步服务

NeZha 任务管理 App 的云同步后端:设备全量任务状态以 JSON 落在 **RDS(MySQL)**,读取走 **DCS(Redis)** 缓存。为华为 ICT 大赛创新赛赛题一(基于华为云产品打造 AI 创新应用)的云服务接入部分。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `PUT` | `/sync/:deviceId` | 上传全量状态 `{ state, updatedAt }`;时间戳较旧时服务端拒绝覆盖 |
| `GET` | `/sync/:deviceId` | 拉取状态:先查 Redis,未命中回源 RDS;无数据返回 `{ state: null, updatedAt: 0 }` |
| `GET` | `/health` | 健康检查,返回 RDS 与 Redis 连通状态(部署验收用) |

冲突策略:客户端携带毫秒时间戳,服务端仅在 `new.updatedAt >= 旧值` 时覆盖,旧设备离线后回连不会覆盖新数据。

## 本地联调

```bash
docker compose up -d      # 起 MySQL(13306)+ Redis(16379)
cp .env.example .env      # 默认配置即可用
npm install
npm run dev               # http://localhost:3000
curl http://localhost:3000/health
```

## 部署华为云

1. **RDS(MySQL)**:购买实例 → 创建数据库 `nezha` → 记住内网地址/账号/密码;白名单放行 ECS 内网。
2. **DCS(Redis)**:购买实例 → 记录内网地址与密码。
3. **ECS**:与 RDS/DCS 同 VPC,安装 Node.js 24 → `npm ci && npm run build` → `node dist/index.js`(建议用 systemd 或 pm2 守护)→ 安全组放行 3000 端口(仅 App 演示需要)。
4. 修改 `.env` 为内网地址(见 `.env.example` 注释),重启后访问 `/health` 验证 `db/redis` 均为 `up`。

> 注意:App 端 `SYNC_BASE_URL`(`mobile/src/config.ts`)填入 `http://<ECS公网IP>:3000` 后再构建。
