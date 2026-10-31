import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** 图片预处理:过宽时等比缩小(控制 token 成本),输出 JPEG base64 供视觉接口使用 */

export interface ImageRef {
  uri: string;
  width: number;
  height: number;
}

/** 处理失败时返回空串 */
export async function resizeImageToBase64(image: ImageRef, maxWidth = 1280): Promise<string> {
  const ctx = ImageManipulator.manipulate(image.uri);
  if (image.width > maxWidth) {
    ctx.resize({ width: maxWidth });
  }
  const rendered = await ctx.renderAsync();
  const result = await rendered.saveAsync({
    base64: true,
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return result.base64 ?? '';
}
