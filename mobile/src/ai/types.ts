/** AI 任务提取层:类型定义。提取结果经归一化后,由任务载入模块写入任务数据层。 */

/** 归一化后的提取任务:日期与时间均为应用内部格式 */
export interface ExtractedTask {
  title: string;
  /** 任务所属日期 'YYYY-MM-DD'(与数据层 dateKey 一致) */
  dateKey: string;
  /** 起始时间 'HH:mm';图中没有时间信息时为空串 */
  startTime: string;
  /** 结束时间 'HH:mm';图中没有时间信息时为空串 */
  endTime: string;
  note?: string;
}

/** 可编辑的导入条目:勾选 + 各字段文案(导入时统一归一化) */
export interface ImportDraft {
  selected: boolean;
  title: string;
  dateText: string;
  startText: string;
  endText: string;
  note: string;
}

/** 模型原始输出条目:日期/时间尚未归一化,允许相对表达(明天、下午3点等) */
export interface RawTaskItem {
  title?: unknown;
  date?: unknown;
  start?: unknown;
  end?: unknown;
  note?: unknown;
}

/** 视觉提取服务:输入图片 base64,输出未归一化的任务条目 */
export interface VisionProvider {
  id: string;
  /** 设置界面展示名 */
  label: string;
  /** 本地模拟提取,不需要 API key */
  mock: boolean;
  /** prompt 由当前预设模板提供,不同预设可给出不同提取指令 */
  extractTasks(imageBase64: string, apiKey: string, prompt: string): Promise<RawTaskItem[]>;
}
