import { resizeImageToBase64, type ImageRef } from './image';
import { normalizeTask } from './parse';
import type { ExtractedTask, VisionProvider } from './types';

/**
 * 提取编排:图片 → 压缩转 base64 → 视觉服务 → 解析归一化。
 * 抛出的错误信息面向用户,由界面直接展示。
 */
export async function extractTasksFromImage(
  provider: VisionProvider,
  apiKey: string,
  image: ImageRef,
  prompt: string,
  signal?: AbortSignal,
): Promise<ExtractedTask[]> {
  const base64 = await resizeImageToBase64(image);
  if (!base64) {
    throw new Error('图片处理失败,请换一张图片试试');
  }
  const raw = await provider.extractTasks(base64, apiKey, prompt, signal);
  const today = new Date();
  return raw
    .map((item) => normalizeTask(item, today))
    .filter((t): t is ExtractedTask => t !== null);
}
