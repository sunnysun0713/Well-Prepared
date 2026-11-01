import { createOpenAICompatProvider } from './openai-compat';
import type { VisionProvider } from './types';

/** 视觉提取服务注册表:新增服务在此登记。提取提示词由模板(见 presets.ts)提供。 */
export const PROVIDERS: VisionProvider[] = [
  createOpenAICompatProvider({
    id: 'deepseek',
    label: 'DeepSeek 视觉',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-flash',
  }),
  createOpenAICompatProvider({
    id: 'qwen-vl',
    label: '通义千问 Qwen-VL',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-vl-plus',
  }),
  createOpenAICompatProvider({
    id: 'glm-4v',
    label: '智谱 GLM-4V',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4v-flash',
  }),
];

/** 按 id 取服务,未知 id 兜底为第一个可用服务 */
export function getProvider(id: string): VisionProvider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
