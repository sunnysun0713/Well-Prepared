/**
 * 提取预设模板:每个预设拥有独立的提示词与展示信息。
 * 新增预设 = 在 PRESETS 里登记一条;预设字段可继续扩展(如个性化选项),
 * 调用方统一通过 getPreset 取用。
 */

export interface ExtractionPreset {
  id: string;
  /** 预设名称,显示在左上角选择器与弹窗中 */
  name: string;
  icon: string;
  /** 一句话说明,帮助用户选对预设 */
  description: string;
  /** 发送给视觉模型的提取提示词 */
  prompt: string;
}

/** 所有预设共用的输出格式约束 */
const OUTPUT_RULES = `只输出 JSON,格式:
{"tasks":[{"title":"简短任务名","date":"YYYY-MM-DD,或 今天/明天/后天/星期X,无法判断则留空","start":"24小时制 HH:mm,无则留空","end":"24小时制 HH:mm,无则留空","note":"备注/地点,无则省略"}]}
要求:图片中没有任务时 tasks 为空数组;不要输出 JSON 以外的任何内容。`;

export const PRESETS: ExtractionPreset[] = [
  {
    id: 'general',
    name: '通用',
    icon: '📋',
    description: '适合通知截图、日程表等一般场景',
    prompt: `你是任务提取助手。请从图片中提取所有任务/日程安排。${OUTPUT_RULES}`,
  },
  {
    id: 'timetable',
    name: '课程表',
    icon: '🏫',
    description: '按星期和节次提取课程,备注教室与教师',
    prompt: `你是课程表提取助手。图片可能是学校课程表,按星期和节次排列。请把每一门课提取为一条任务:title 用课程名,date 用课程所在星期(如 周一),start/end 用上课起止时间,note 写教室和教师;同一课程出现在多个星期时,每个星期各输出一条。${OUTPUT_RULES}`,
  },
  {
    id: 'meeting',
    name: '会议通知',
    icon: '📢',
    description: '从通知/群消息中提取会议与活动安排',
    prompt: `你是会议通知提取助手。请从通知、群消息截图中提取需要参加的会议或活动:title 用会议主题,date/start/end 用通知中的时间,note 写地点、组织者和参与人;只提取有明确时间或需要行动的事项。${OUTPUT_RULES}`,
  },
  {
    id: 'handwritten',
    name: '手写日程',
    icon: '✍️',
    description: '识别手写待办与日程,不编造内容',
    prompt: `你是手写日程识别助手。请识别图片中的手写或打印日程、待办清单,逐条提取为任务;字迹不确定时按最合理的读法填写,不要编造图中没有的内容。${OUTPUT_RULES}`,
  },
];

export const DEFAULT_PRESET_ID = 'general';

/** 按 id 取预设,未知 id 兜底为通用预设 */
export function getPreset(id: string): ExtractionPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** 预设显示名:有自定义名称时优先,否则用默认名 */
export function presetDisplayName(
  preset: ExtractionPreset,
  customNames: Record<string, string>,
): string {
  return customNames[preset.id]?.trim() || preset.name;
}
