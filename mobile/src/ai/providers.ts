import { createOpenAICompatProvider, type CompatConfig } from './openai-compat';
import type { VisionProvider } from './types';

/** 视觉提取服务注册表:新增服务在此登记。提取提示词由模板(见 presets.ts)提供。 */
const PROVIDER_CONFIGS: CompatConfig[] = [
  {
    id: 'huawei-maas',
    label: '华为云 MaaS',
    baseUrl: 'https://api.modelarts-maas.com/openai/v1/chat/completions',
    // 默认模型名可在 AI 设置中覆盖;实际名称以 MaaS 控制台「API 调用」页为准
    model: 'deepseek-v4.1-flash-1017',
    customModel: true,
    modelHint: '模型名以华为云 ModelArts Studio 控制台「API 调用」页为准,如 deepseek-v4.1-flash-1017',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek 视觉',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-flash',
  },
  {
    id: 'qwen-vl',
    label: '通义千问 Qwen-VL',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-vl-plus',
  },
  {
    id: 'glm-4v',
    label: '智谱 GLM-4V',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4v-flash',
  },
];

export const PROVIDERS: VisionProvider[] = PROVIDER_CONFIGS.map((config) =>
  createOpenAICompatProvider(config),
);

/**
 * 按 id 取服务,未知 id 兜底为第一个可用服务。
 * customModel 为空串或服务商不支持自定义时,使用该服务的默认模型。
 */
export function getProvider(id: string, customModel?: string): VisionProvider {
  const config = PROVIDER_CONFIGS.find((p) => p.id === id) ?? PROVIDER_CONFIGS[0];
  const model = config.customModel && customModel?.trim() ? customModel.trim() : config.model;
  return createOpenAICompatProvider({ ...config, model });
}
