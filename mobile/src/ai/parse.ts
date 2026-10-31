import { dateKeyOf } from '@/data/tasks';
import type { ExtractedTask, RawTaskItem } from './types';

/** AI 输出归一化:纯函数,把模型返回的相对表达(明天、下午3点)转成应用内部格式。 */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function shiftDate(today: Date, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return dateKeyOf(d);
}

/** 星期文字 → 数字(周一=1 … 周日=0) */
const WEEKDAY_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};

/**
 * 归一化日期:支持 今天/明天/后天/昨天、星期X(取下一次出现)、YYYY-MM-DD、M月D日 等;
 * 无法识别时兜底为今天。
 */
export function normalizeDate(value: unknown, today: Date): string {
  const s = asString(value).replace(/\s+/g, '');
  if (!s) return dateKeyOf(today);
  if (s.includes('今天') || s === '今日') return dateKeyOf(today);
  if (s.includes('明天') || s === '明日') return shiftDate(today, 1);
  if (s.includes('后天') || s === '后日') return shiftDate(today, 2);
  if (s.includes('昨天') || s === '昨日') return shiftDate(today, -1);

  // 星期X:取该星期的下一次出现(今天就是该星期时取今天)
  const wd = s.match(/^(?:周|星期|礼拜)([一二三四五六日天])$/);
  if (wd) {
    const target = WEEKDAY_NUM[wd[1]];
    const diff = (target - today.getDay() + 7) % 7;
    return shiftDate(today, diff);
  }

  // 完整日期:YYYY-MM-DD / YYYY/M/D / YYYY年M月D日
  const full = s.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?$/);
  if (full) {
    const d = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
    if (d.getMonth() === Number(full[2]) - 1 && d.getDate() === Number(full[3])) {
      return dateKeyOf(d);
    }
    return dateKeyOf(today);
  }

  // 缺年份:M月D日,按今年处理
  const md = s.match(/^(\d{1,2})月(\d{1,2})日?$/);
  if (md) {
    const d = new Date(today.getFullYear(), Number(md[1]) - 1, Number(md[2]));
    if (d.getMonth() === Number(md[1]) - 1 && d.getDate() === Number(md[2])) {
      return dateKeyOf(d);
    }
    return dateKeyOf(today);
  }

  return dateKeyOf(today);
}

/** 上午/下午修饰与小时数 → 24 小时制小时 */
function applyHalfDay(h: number, part: string): number {
  if (part === '下午' || part === '晚上') {
    return h < 12 ? h + 12 : h;
  }
  if (part === '中午') {
    return h < 11 ? h + 12 : h;
  }
  if (part === '上午' || part === '早上') {
    return h === 12 ? 0 : h;
  }
  return h;
}

/**
 * 归一化时间:支持 HH:mm(可缺前导零)、中文表达(下午3点、上午9点半、晚上7点30分)等;
 * 无法识别时返回空串(表示未指定时间)。
 */
export function normalizeTime(value: unknown): string {
  const s = asString(value).replace(/\s+/g, '');
  if (!s) return '';
  if (TIME_RE.test(s)) return s;

  // H:mm 缺前导零
  const loose = s.match(/^(\d{1,2}):(\d{2})$/);
  if (loose && Number(loose[1]) <= 23 && Number(loose[2]) <= 59) {
    return `${pad(Number(loose[1]))}:${pad(Number(loose[2]))}`;
  }

  // 下午3点 / 上午9点半 / 晚上7点30分
  const cn = s.match(/^(上午|早上|中午|下午|晚上)?(\d{1,2})[点时](半|(\d{1,2})分)?$/);
  if (cn) {
    const h = applyHalfDay(Number(cn[2]), cn[1] ?? '');
    const m = cn[3] === '半' ? 30 : cn[3] ? Number(cn[4]) : 0;
    if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
  }

  return '';
}

/** 归一化单条原始条目:标题缺失时丢弃 */
export function normalizeTask(raw: RawTaskItem, today: Date): ExtractedTask | null {
  const title = asString(raw.title).slice(0, 50);
  if (!title) return null;
  const note = asString(raw.note).slice(0, 100);
  return {
    title,
    dateKey: normalizeDate(raw.date, today),
    startTime: normalizeTime(raw.start),
    endTime: normalizeTime(raw.end),
    note: note || undefined,
  };
}

/**
 * 解析模型返回文本中的 JSON:容忍 ```json 围栏与前后杂散文字。
 * 模型输出结构应为 { tasks: RawTaskItem[] }。
 */
export function parseModelResponse(text: string): RawTaskItem[] {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('AI 返回内容不是 JSON,请重试');
  }
  let data: unknown;
  try {
    data = JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    throw new Error('AI 返回的 JSON 解析失败,请重试');
  }
  const tasks = (data as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) {
    throw new Error('AI 返回内容缺少任务列表,请重试');
  }
  return tasks.filter((t): t is RawTaskItem => typeof t === 'object' && t !== null);
}

/** dateKey 转友好标签:今天 / 明天 / 昨天 / M月D日(跨年带年份) */
export function dateLabel(dateKey: string, today: Date): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(y, m - 1, d) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === -1) return '昨天';
  if (y === today.getFullYear()) return `${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}
