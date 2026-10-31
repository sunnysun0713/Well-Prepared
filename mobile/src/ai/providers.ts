import { mockProvider } from './mock-provider';
import { createOpenAICompatProvider } from './openai-compat';
import type { VisionProvider } from './types';

/** 提取提示词:要求模型只输出结构化 JSON,时间统一 24 小时制 */
const EXTRACT_PROMPT = `你是任务提取助手。请从图片中提取所有任务/日程安排,只输出 JSON,格式:
{"tasks":[{"title":"简短任务名","date":"YYYY-MM-DD,或 今天/明天/后天/星期X,无法判断则留空","start":"24小时制 HH:mm,无则留空","end":"24小时制 HH:mm,无则留空","note":"备注/地点,无则省略"}]}
要求:图片中没有任务时 tasks 为空数组;不要输出 JSON 以外的任何内容。`;

/** 视觉提取服务注册表:新增服务在此登记 */
export const PROVIDERS: VisionProvider[] = [
  mockProvider,
  createOpenAICompatProvider({
    id: 'deepseek',
    label: 'DeepSeek 视觉',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-flash',
    prompt: EXTRACT_PROMPT,
  }),
  createOpenAICompatProvider({
    id: 'qwen-vl',
    label: '通义千问 Qwen-VL',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-vl-plus',
    prompt: EXTRACT_PROMPT,
  }),
  createOpenAICompatProvider({
    id: 'glm-4v',
    label: '智谱 GLM-4V',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4v-flash',
    prompt: EXTRACT_PROMPT,
  }),
];

/** 按 id 取服务,未知 id 兜底为模拟提取器 */
export function getProvider(id: string): VisionProvider {
  return PROVIDERS.find((p) => p.id === id) ?? mockProvider;
}
