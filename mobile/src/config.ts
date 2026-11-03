/** 应用级编译期配置 */

/**
 * 云同步服务地址(部署在华为云 ECS 上的 NeZha 同步服务,见仓库 server/ 目录)。
 *
 * 优先读取构建环境变量 EXPO_PUBLIC_SYNC_BASE_URL,便于 EAS/CI 按环境注入而不用改源码:
 *   EXPO_PUBLIC_SYNC_BASE_URL=https://sync.example.com npx expo export --platform android
 * 未设置时使用下面的常量(本地调试可直接改这里)。
 *
 * 空串表示未配置:云同步保持关闭,应用退化为纯本地运行。
 *
 * 注意:Android 9+ 默认禁止明文 HTTP,正式构建请填 HTTPS 地址;
 * 只有临时演示包才考虑开启 usesCleartextTraffic,不要把 HTTP 地址用于正式提交。
 */
const ENV_SYNC_BASE_URL = process.env.EXPO_PUBLIC_SYNC_BASE_URL ?? '';

export const SYNC_BASE_URL = ENV_SYNC_BASE_URL || '';
