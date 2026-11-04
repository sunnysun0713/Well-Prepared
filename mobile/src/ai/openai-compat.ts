import { parseModelResponse } from './parse';
import type { RawTaskItem, VisionProvider } from './types';

/**
 * OpenAI 兼容视觉接口适配器:通义千问 Qwen-VL 与智谱 GLM-4V 均使用
 * chat/completions 协议与 image_url 图片输入,只差地址与模型名。
 */

export interface CompatConfig {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** 是否允许用户在 AI 设置里覆盖模型名 */
  customModel?: boolean;
  /** 自定义模型名输入框下方的提示文案 */
  modelHint?: string;
}

interface CompatResponse {
  choices?: { message?: { content?: unknown } }[];
}

export function createOpenAICompatProvider(config: CompatConfig): VisionProvider {
  return {
    id: config.id,
    label: config.label,
    customModel: config.customModel,
    modelHint: config.modelHint,
    async extractTasks(
      imageBase64: string,
      apiKey: string,
      prompt: string,
      signal?: AbortSignal,
    ): Promise<RawTaskItem[]> {
      const res = await fetch(config.baseUrl, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error('API Key 无效或已过期,请到右上角设置中检查');
      }
      if (!res.ok) {
        throw new Error(`AI 服务请求失败(HTTP ${res.status}),请稍后重试`);
      }
      const data = (await res.json()) as CompatResponse;
      const text = typeof data.choices?.[0]?.message?.content === 'string'
        ? data.choices[0].message.content
        : '';
      if (!text) {
        throw new Error('AI 返回内容为空,请重试');
      }
      return parseModelResponse(text);
    },
  };
}
