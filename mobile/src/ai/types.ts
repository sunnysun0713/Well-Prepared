/** AI 任务提取层:类型定义。提取结果经归一化后,由任务载入模块写入任务数据层。 */

/** 归一化后的提取任务:日期与时间均为应用内部格式 */
export interface ExtractedTask {
  title: string;
  /** 任务所属日期 'YYYY-MM-DD'(与数据层 dateKey 一致);跨多天时为开始日期 */
  dateKey: string;
  /** 跨多天任务的结束日期 'YYYY-MM-DD';单日任务为空 */
  endDateKey?: string;
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
  /** 结束日期文案;留空表示单日任务 */
  endDateText: string;
  startText: string;
  endText: string;
  note: string;
}

/** 模型原始输出条目:日期/时间尚未归一化,允许相对表达(明天、下午3点等) */
export interface RawTaskItem {
  title?: unknown;
  date?: unknown;
  /** 结束日期;仅跨多天任务提供 */
  endDate?: unknown;
  start?: unknown;
  end?: unknown;
  note?: unknown;
}

/** 视觉提取服务:输入图片 base64,输出未归一化的任务条目 */
export interface VisionProvider {
  id: string;
  /** 设置界面展示名 */
  label: string;
  /** 是否允许用户在 AI 设置里自定义模型名(服务商模型名随控制台变化时使用) */
  customModel?: boolean;
  /** 自定义模型名输入框下方的提示文案 */
  modelHint?: string;
  /** prompt 由当前模板提供,不同模板可给出不同提取指令 */
  extractTasks(imageBase64: string, apiKey: string, prompt: string): Promise<RawTaskItem[]>;
}
