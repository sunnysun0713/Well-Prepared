import AV from 'leancloud-storage';
import { adapters } from './adapters';
import type { CloudConfig } from './config';

let initializedKey = '';

/**
 * 初始化 LeanCloud(幂等):配置变化时重新初始化。
 * 必须在任何 AV 调用之前执行。
 */
export function ensureLeanCloud(config: CloudConfig): typeof AV {
  const key = `${config.appId}|${config.appKey}|${config.serverURL}`;
  if (initializedKey === key) return AV;

  AV.setAdapters(adapters);
  AV.init({
    appId: config.appId,
    appKey: config.appKey,
    serverURL: config.serverURL,
  });
  initializedKey = key;
  return AV;
}

export { AV };
