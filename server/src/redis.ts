/** DCS(Redis)客户端:本地开发用 docker-compose 的 Redis,部署华为云时改 .env */
import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:16379', {
      // 单次请求失败快速返回,由业务代码降级回源 RDS
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 2000, 10000),
    });
  }
  return client;
}
