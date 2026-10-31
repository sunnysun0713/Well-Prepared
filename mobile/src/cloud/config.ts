import AsyncStorage from '@react-native-async-storage/async-storage';

/** LeanCloud 应用配置:在 LeanCloud 控制台「设置 → 应用凭证」中获取 */
export interface CloudConfig {
  appId: string;
  appKey: string;
  /** 国际版必填,形如 https://xxx.api.lncldglobal.com */
  serverURL: string;
}

const STORAGE_KEY = 'cloud-config-v1';

export const EMPTY_CLOUD_CONFIG: CloudConfig = { appId: '', appKey: '', serverURL: '' };

/** 配置是否完整可用 */
export function isCloudConfigReady(config: CloudConfig): boolean {
  return Boolean(config.appId.trim() && config.appKey.trim() && config.serverURL.trim());
}

/** 读取本地保存的云配置;失败时返回空配置 */
export async function loadCloudConfig(): Promise<CloudConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CLOUD_CONFIG;
    const parsed = JSON.parse(raw) as Partial<CloudConfig>;
    return {
      appId: typeof parsed.appId === 'string' ? parsed.appId : '',
      appKey: typeof parsed.appKey === 'string' ? parsed.appKey : '',
      serverURL: typeof parsed.serverURL === 'string' ? parsed.serverURL : '',
    };
  } catch {
    return EMPTY_CLOUD_CONFIG;
  }
}

/** 保存云配置 */
export async function saveCloudConfig(config: CloudConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
