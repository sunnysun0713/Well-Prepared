import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Adapters, RequestOptions, Response } from '@leancloud/adapter-types';

/**
 * React Native 平台适配器:LeanCloud JS SDK 在 RN 下没有官方适配器,
 * 这里用 fetch + AsyncStorage + RN 自带 WebSocket 补齐。
 */

async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', headers = {}, data } = options;
  const finalHeaders: Record<string, string> = { ...headers };
  let body: string | undefined;
  if (data !== undefined) {
    body = JSON.stringify(data);
    const hasContentType = Object.keys(finalHeaders).some(
      (key) => key.toLowerCase() === 'content-type',
    );
    if (!hasContentType) finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { method, headers: finalHeaders, body });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // 非 JSON 响应保留原文
  }
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  return {
    ok: res.ok,
    status: res.status,
    headers: responseHeaders,
    data: parsed as object,
  };
}

const storage = {
  async: true as const,
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  clear: () => AsyncStorage.clear(),
};

export const adapters: Partial<Adapters> = {
  platformInfo: { name: 'ReactNative' },
  request,
  // 文件上传暂未使用(头像用文字/emoji),需要时再补 FormData 实现
  upload: async () => {
    throw new Error('当前版本不支持文件上传');
  },
  storage,
  WebSocket: globalThis.WebSocket as unknown as Adapters['WebSocket'],
  getAuthInfo: async () => {
    throw new Error('第三方登录暂未接入');
  },
};
