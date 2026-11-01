/** 任务状态同步接口:设备全量状态 + 毫秒时间戳,冲突按时间戳取新 */
import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { getRedis } from './redis';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const CACHE_TTL_SECONDS = 3600;

interface SyncEnvelope {
  state: unknown;
  updatedAt: number;
}

function cacheKey(deviceId: string): string {
  return `sync:state:${deviceId}`;
}

/** 回源 RDS 读取设备状态;不存在时返回 null */
async function readFromDb(deviceId: string): Promise<SyncEnvelope | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    'SELECT state, updated_at FROM task_states WHERE device_id = ?',
    [deviceId],
  );
  const row = rows[0];
  if (!row) return null;
  return { state: row.state, updatedAt: Number(row.updated_at) };
}

/** 以数据库当前值为准刷新缓存(避免被拒绝的旧数据污染缓存) */
async function refreshCache(deviceId: string): Promise<void> {
  const latest = await readFromDb(deviceId);
  if (!latest) return;
  await getRedis()
    .set(cacheKey(deviceId), JSON.stringify(latest), 'EX', CACHE_TTL_SECONDS)
    .catch(() => {
      // Redis 不可用时跳过缓存,读时回源 RDS
    });
}

export const syncRouter = Router();

// PUT /sync/:deviceId — 上传全量状态;时间戳较旧时服务端拒绝覆盖
syncRouter.put('/sync/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  if (!DEVICE_ID_PATTERN.test(deviceId)) {
    res.status(400).json({ error: 'deviceId 不合法' });
    return;
  }
  const body: unknown = req.body;
  const record = typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)
    : null;
  if (
    !record ||
    typeof record.state !== 'object' ||
    record.state === null ||
    typeof record.updatedAt !== 'number' ||
    !Number.isFinite(record.updatedAt)
  ) {
    res.status(400).json({ error: 'state 与 updatedAt 必填' });
    return;
  }
  const { state, updatedAt } = record as { state: object; updatedAt: number };
  try {
    await getPool().query(
      `INSERT INTO task_states (device_id, state, updated_at) VALUES (?, ?, ?) AS new
       ON DUPLICATE KEY UPDATE
         state = IF(new.updated_at >= task_states.updated_at, new.state, task_states.state),
         updated_at = IF(new.updated_at >= task_states.updated_at, new.updated_at, task_states.updated_at)`,
      [deviceId, JSON.stringify(state), updatedAt],
    );
    await refreshCache(deviceId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sync] PUT 写入失败:', err);
    res.status(500).json({ error: '服务端写入失败,请稍后重试' });
  }
});

// GET /sync/:deviceId — 拉取状态:先查 Redis 缓存,未命中回源 RDS
syncRouter.get('/sync/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  if (!DEVICE_ID_PATTERN.test(deviceId)) {
    res.status(400).json({ error: 'deviceId 不合法' });
    return;
  }
  try {
    const cached = await getRedis().get(cacheKey(deviceId)).catch(() => null);
    if (cached) {
      res.json(JSON.parse(cached) as SyncEnvelope);
      return;
    }
    const fromDb = await readFromDb(deviceId);
    if (!fromDb) {
      // 云端尚无该设备数据,客户端上传本地存档即可
      res.json({ state: null, updatedAt: 0 });
      return;
    }
    await refreshCache(deviceId);
    res.json(fromDb);
  } catch (err) {
    console.error('[sync] GET 读取失败:', err);
    res.status(500).json({ error: '服务端读取失败,请稍后重试' });
  }
});
