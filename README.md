# NeZha 任务管理

拍照即可成任务:拍一张课程表、值班表或手写清单,AI 自动识别并生成带提醒的任务,支持本地提醒与云同步。参加华为 ICT 大赛创新赛赛题一(基于华为云产品打造 AI 创新应用)的作品。

## 功能

- **每日任务**:秒级时钟、左右滑动/箭头切日、今日紧急任务提示条、右下角新增
- **任务卡片**:名称/备注/时间/闹钟提醒/短信提醒(各自独立时间与铃声)、两步确认删除
- **日历**:年月滚轮选日,点选日期查看当天任务并新增
- **任务载入(核心 AI 能力)**:拍照/选图 → 视觉大模型提取任务 → 自动导入或勾选确认;支持自定义提取模板与 AI 服务切换
- **提醒**:本地通知双通道(闹钟 + 短信),删除/关闭任务自动取消
- **云同步**:任务状态匿名设备同步,断网自动降级纯本地,恢复后按时间戳合并

## 架构

```
┌────────────────────────┐        ┌──────────────────────────────┐
│ NeZha App (Expo/RN)    │  HTTP  │ 同步服务 (server/, ECS 部署)  │
│ · AI 提取(华为云 MaaS) │───────▶│ · Express API                │
│ · 本地提醒/本地持久化   │  PUT/  │ · RDS(MySQL) 持久化任务状态  │
│ · 云同步(匿名设备 ID)   │  GET   │ · DCS(Redis) 读取缓存        │
└────────────────────────┘        └──────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|---|---|
| App | Expo SDK 58 / React Native 0.88 / expo-router / TypeScript strict |
| AI | 华为云 MaaS(盘古/Qwen 视觉模型,OpenAI 兼容接口;亦支持 DeepSeek/Qwen-VL/GLM-4V 与本地 Mock) |
| 后端 | Node.js + Express(部署华为云 ECS) |
| 存储 | 华为云 RDS(MySQL),App 本地 AsyncStorage |
| 缓存 | 华为云 DCS(Redis) |

## 目录

- `mobile/` — App 源码(模块化:`src/modules/` 每日任务/日历/任务载入,`src/ai/` AI 提取层,`src/data/` 数据与同步层)
- `server/` — 云同步后端(本地 docker-compose 一键联调,部署说明见 `server/README.md`)

## 快速开始

App:

```bash
cd mobile
npm install
npx expo start --port 8081
```

同步后端(本地联调,需 Docker):

```bash
cd server
docker compose up -d
cp .env.example .env
npm install
npm run dev          # http://localhost:3000,curl /health 验证
```

默认 `mobile/src/config.ts` 中 `SYNC_BASE_URL` 为空串(纯本地运行);填入服务地址后重新构建即启用云同步。

## 华为云服务对照

| 组件 | 华为云产品 |
|---|---|
| 任务状态存储 | RDS for MySQL |
| 同步读取缓存 | DCS for Redis |
| 后端部署 | ECS(弹性云服务器) |
| AI 视觉提取 | ModelArts Studio(MaaS) |
| 开发工具 | 码道 CodeArts 代码智能体 |

> API Key 不内置:AI 服务密钥由用户在 App 内「AI 设置」中自行填写,仅保存在本机。
