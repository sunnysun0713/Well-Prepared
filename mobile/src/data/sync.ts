/**
 * 云同步层:设备匿名 ID + 全量任务状态上传/拉取。
 * 同步失败一律静默降级为纯本地,不阻塞任何本地操作。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYNC_BASE_URL } from '@/config';

/** 同步信封:设备全量任务状态 + 毫秒时间戳,云端按时间戳取新 */
export interface SyncEnvelope {
  state: unknown;
  updatedAt: number;
}

const DEVICE_KEY = 'sync-device-id-v1';
let cachedDeviceId: string | null = null;

/** 设备标识:首次生成后持久化,同一台设备始终用同一 ID 同步(无需注册登录) */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  let id: string | null = null;
  try {
    id = await AsyncStorage.getItem(DEVICE_KEY);
  } catch {
    id = null;
  }
  if (!id) {
    id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {
      // 写入失败下次重新生成,不影响本次同步
    });
  }
  cachedDeviceId = id;
  return id;
}

/** 云同步是否可用(未配置服务地址时保持关闭) */
export function syncEnabled(): boolean {
  return SYNC_BASE_URL.trim().length > 0;
}

function syncBase(): string {
  return SYNC_BASE_URL.trim().replace(/\/+$/, '');
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 上传全量状态;失败静默,下次变更或启动时重试 */
export async function pushState(state: unknown, updatedAt: number): Promise<void> {
  if (!syncEnabled()) return;
  try {
    const deviceId = await getDeviceId();
    const res = await fetchWithTimeout(
      `${syncBase()}/sync/${deviceId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, updatedAt }),
      },
      5000,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // 同步失败不影响本地使用
  }
}

/** 拉取云端状态;未配置、云端无数据或请求失败时返回 null */
export async function pullState(): Promise<SyncEnvelope | null> {
  if (!syncEnabled()) return null;
  try {
    const deviceId = await getDeviceId();
    const res = await fetchWithTimeout(`${syncBase()}/sync/${deviceId}`, { method: 'GET' }, 5000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { state?: unknown; updatedAt?: unknown };
    if (typeof data.state !== 'object' || data.state === null || typeof data.updatedAt !== 'number') {
      return null;
    }
    return { state: data.state, updatedAt: data.updatedAt };
  } catch {
    return null;
  }
}
