/**
 * 提取模板:每个模板拥有独立的提示词与展示信息。
 * PRESETS 是内置模板的初始值;运行时的模板列表保存在 AI 设置里,可增删。
 */

export interface ExtractionPreset {
  id: string;
  /** 模板名称,显示在模板弹窗中 */
  name: string;
  icon: string;
  /** 发送给视觉模型的提取规则(提示词) */
  prompt: string;
}

/** 旧版输出格式(用于迁移已保存到本地设置里的模板提示词) */
export const LEGACY_OUTPUT_RULES = `只输出 JSON,格式:
{"tasks":[{"title":"简短任务名","date":"YYYY-MM-DD,或 今天/明天/后天/星期X,无法判断则留空","start":"24小时制 HH:mm,无则留空","end":"24小时制 HH:mm,无则留空","note":"备注/地点,无则省略"}]}
要求:图片中没有任务时 tasks 为空数组;不要输出 JSON 以外的任何内容。`;

/** 所有模板共用的输出格式约束(自定义模板保存时自动追加) */
export const OUTPUT_RULES = `只输出 JSON,格式:
{"tasks":[{"title":"简短任务名","date":"开始日期,YYYY-MM-DD,或 今天/明天/后天/星期X,无法判断则留空","endDate":"结束日期,YYYY-MM-DD,或 今天/明天/后天/星期X;只有跨多天任务才填写,单日任务留空","start":"24小时制 HH:mm,无则留空","end":"24小时制 HH:mm,无则留空","note":"备注/地点,无则省略"}]}
跨多天判断规则:
- 同一个事项跨多天(如「11月5日-10日」「周三到周五」「出差三天」「期间」)只输出一条:date 填开始日,endDate 填结束日,不要按天拆成多条;
- 只有结束日与开始日不同才算跨多天;单日任务(包括不是今天的任务)endDate 留空;
- 无法确定结束日时 endDate 留空。
要求:图片中没有任务时 tasks 为空数组;不要输出 JSON 以外的任何内容。`;

/** 通用提取提示词:自定义模板不填规则时使用 */
export const GENERAL_PROMPT = `你是任务提取助手。请从图片中提取所有任务/日程安排。${OUTPUT_RULES}`;

export const PRESETS: ExtractionPreset[] = [
  {
    id: 'general',
    name: '通用',
    icon: '📋',
    prompt: GENERAL_PROMPT,
  },
  {
    id: 'timetable',
    name: '课程表',
    icon: '🏫',
    prompt: `你是课程表提取助手。图片可能是学校课程表,按星期和节次排列。请把每一门课提取为一条任务:title 用课程名,date 用课程所在星期(如 周一),start/end 用上课起止时间,note 写教室和教师;同一课程出现在多个星期时,每个星期各输出一条。${OUTPUT_RULES}`,
  },
  {
    id: 'meeting',
    name: '会议通知',
    icon: '📢',
    prompt: `你是会议通知提取助手。请从通知、群消息截图中提取需要参加的会议或活动:title 用会议主题,date/start/end 用通知中的时间,note 写地点、组织者和参与人;只提取有明确时间或需要行动的事项。${OUTPUT_RULES}`,
  },
  {
    id: 'handwritten',
    name: '手写日程',
    icon: '✍️',
    prompt: `你是手写日程识别助手。请识别图片中的手写或打印日程、待办清单,逐条提取为任务;字迹不确定时按最合理的读法填写,不要编造图中没有的内容。${OUTPUT_RULES}`,
  },
];

export const DEFAULT_PRESET_ID = 'general';

/** 按 id 取内置预设,未知 id 兜底为第一个内置预设(仅作默认值参考) */
export function getPreset(id: string): ExtractionPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
