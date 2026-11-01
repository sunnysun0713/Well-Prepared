/** NeZha 任务同步服务:华为云 RDS(MySQL)+ DCS(Redis),部署见 README.md */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { getPool, initDb } from './db';
import { getRedis } from './redis';
import { syncRouter } from './sync';

const PORT = Number(process.env.PORT ?? '3000');

async function main(): Promise<void> {
  const app = express();
  // Expo Web 演示端需要跨域;移动端 App 不受影响
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // 健康检查:部署验收/比赛演示用,顺带证明 RDS 与 Redis 均已接通
  app.get('/health', async (_req, res) => {
    let db = 'down';
    let redis = 'down';
    try {
      await getPool().query('SELECT 1');
      db = 'up';
    } catch (err) {
      console.error('[health] RDS 不可用:', err);
    }
    try {
      await getRedis().ping();
      redis = 'up';
    } catch (err) {
      console.error('[health] Redis 不可用:', err);
    }
    const ok = db === 'up' && redis === 'up';
    res.status(ok ? 200 : 503).json({ ok, db, redis });
  });

  app.use(syncRouter);

  await initDb();
  app.listen(PORT, () => {
    console.log(`NeZha 同步服务已启动:http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
