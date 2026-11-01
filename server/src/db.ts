/** RDS(MySQL)连接池:本地开发用 docker-compose 的 MySQL,部署华为云时改 .env */
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? '13306'),
      user: process.env.DB_USER ?? 'nezha',
      password: process.env.DB_PASSWORD ?? 'nezha123',
      database: process.env.DB_NAME ?? 'nezha',
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

/** 启动时确保表存在(华为云 RDS 首次部署自动建表) */
export async function initDb(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS task_states (
      device_id VARCHAR(64) PRIMARY KEY,
      state JSON NOT NULL,
      updated_at BIGINT NOT NULL,
      KEY idx_updated_at (updated_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
}
