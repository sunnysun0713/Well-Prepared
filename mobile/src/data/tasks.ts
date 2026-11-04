/** 任务数据层:类型定义与示例数据。运行时的可编辑状态见 tasks-context.tsx。 */

/** 任务类型:short = 短时任务(当天完成);span = 跨多天任务 */
export type TaskKind = 'short' | 'span';

export interface Task {
  id: string;
  title: string;
  /** 起始时间,格式 'HH:mm' */
  startTime: string;
  /** 结束时间,格式 'HH:mm' */
  endTime: string;
  note?: string;
  /** 任务类型;缺省视为短时任务,兼容旧存档 */
  kind?: TaskKind;
  /** 跨多天任务开始日期键 'YYYY-M-D';与所在分组一致 */
  startDateKey?: string;
  /** 跨多天任务结束日期键 'YYYY-M-D';短时任务为空 */
  endDateKey?: string;
  /** 由长时任务自动生成的开始/结束短时任务,指向长时任务 id */
  parentId?: string;
  /** 自动生成任务的角色 */
  spanRole?: 'start' | 'end';
  /** 提前提醒的分钟数;未设置表示无提醒 */
  remindAdvanceMinutes?: number;
  /** 闹钟铃声 id(见 reminder-sounds.ts);未设置表示默认铃声 */
  remindSound?: string;
  /** 短信提醒的提前分钟数,独立于闹钟提醒;未设置表示未开启 */
  smsRemindAdvanceMinutes?: number;
  /** 短信提醒铃声 id;未设置表示默认铃声 */
  smsRemindSound?: string;
  /** 是否收藏(紧急任务);收藏后每日任务顶部显示数量 */
  favorite?: boolean;
}

/** 任务状态:按日期键分组 */
export type TasksState = Record<string, Task[]>;

/** 日期键 'YYYY-MM-DD' */
export function dateKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** 解析日期键;格式非法时返回 null */
export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** 日期键转 UTC 天序号,用于跨天比较(不受时区与补零影响) */
export function dayIndex(key: string): number | null {
  const date = parseDateKey(key);
  if (!date) return null;
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
}

/** 是否跨多天任务 */
export function isSpanTask(task: Task): boolean {
  return task.kind === 'span' && Boolean(task.startDateKey && task.endDateKey);
}

/** 跨多天任务是否覆盖某一天(含首尾) */
export function spanCoversDate(task: Task, date: Date): boolean {
  if (!isSpanTask(task)) return false;
  const start = dayIndex(task.startDateKey as string);
  const end = dayIndex(task.endDateKey as string);
  const target = dayIndex(dateKeyOf(date));
  if (start == null || end == null || target == null) return false;
  return target >= start && target <= end;
}

export type SpanStatus = 'pending' | 'active' | 'overdue';

export interface SpanProgress {
  status: SpanStatus;
  /** 总时长(毫秒) */
  totalMs: number;
  /** 已过时长(毫秒),未开始时为 0 */
  elapsedMs: number;
  /** 剩余时长(毫秒),已结束时为 0 */
  remainingMs: number;
  /** 已过比例 0–1,用于进度条宽度 */
  ratio: number;
  startAt: Date;
  endAt: Date;
}

function timeParts(value: string, fallbackHour: number): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? [Number(match[1]), Number(match[2])] : [fallbackHour, 0];
}

/** 计算跨多天任务的起止时刻与剩余进度 */
export function spanProgress(task: Task, now: Date = new Date()): SpanProgress | null {
  if (!isSpanTask(task)) return null;
  const startDate = parseDateKey(task.startDateKey as string);
  const endDate = parseDateKey(task.endDateKey as string);
  if (!startDate || !endDate) return null;
  const [sh, sm] = timeParts(task.startTime, 0);
  const [eh, em] = timeParts(task.endTime, 23);
  const startAt = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    sh,
    sm,
  );
  const endAt = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    eh,
    em,
  );
  const totalMs = Math.max(60000, endAt.getTime() - startAt.getTime());
  const nowMs = now.getTime();
  const status: SpanStatus =
    nowMs >= endAt.getTime() ? 'overdue' : nowMs < startAt.getTime() ? 'pending' : 'active';
  const elapsedMs = Math.min(Math.max(nowMs - startAt.getTime(), 0), totalMs);
  return {
    status,
    totalMs,
    elapsedMs,
    remainingMs: Math.max(endAt.getTime() - nowMs, 0),
    ratio: elapsedMs / totalMs,
    startAt,
    endAt,
  };
}

/** 剩余时长文案:天数优先,其次小时,最后分钟 */
export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`;
  if (hours > 0) return mins > 0 ? `${hours} 小时 ${mins} 分` : `${hours} 小时`;
  return `${mins} 分钟`;
}

/** 跨多天任务的日期范围文案 */
export function spanRangeLabel(task: Task): string {
  const start = task.startDateKey ? parseDateKey(task.startDateKey) : null;
  const end = task.endDateKey ? parseDateKey(task.endDateKey) : null;
  if (!start || !end) return '';
  const startText = `${start.getMonth() + 1}月${start.getDate()}日`;
  const endText = `${end.getMonth() + 1}月${end.getDate()}日`;
  return `${startText} ${task.startTime} → ${endText} ${task.endTime}`;
}

/** 'HH:mm' 平移分钟数,结果限制在当天 00:00–23:59 */
function shiftTime(value: string, deltaMinutes: number): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return value;
  const total = Math.min(
    Math.max(Number(match[1]) * 60 + Number(match[2]) + deltaMinutes, 0),
    23 * 60 + 59,
  );
  const hour = String(Math.floor(total / 60)).padStart(2, '0');
  const minute = String(total % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

const MARKER_MINUTES = 30;

/**
 * 长时任务派生出的两条短时任务:
 * 开始当天一条「开始 · 标题」,结束当天一条「结束 · 标题」。
 */
export function buildSpanMarkers(span: Task): { dateKey: string; task: Task }[] {
  if (!isSpanTask(span)) return [];
  const startKey = span.startDateKey as string;
  const endKey = span.endDateKey as string;
  const range = spanRangeLabel(span);

  // 开始标记:开始时刻起 30 分钟;越界时改为开始前 30 分钟
  let startFrom = span.startTime;
  let startTo = shiftTime(startFrom, MARKER_MINUTES);
  if (startTo <= startFrom) {
    startTo = startFrom;
    startFrom = shiftTime(startTo, -MARKER_MINUTES);
  }
  // 结束标记:结束时刻前 30 分钟;越界时改为结束后 30 分钟
  let endFrom = shiftTime(span.endTime, -MARKER_MINUTES);
  let endTo = span.endTime;
  if (endFrom >= endTo) {
    endFrom = endTo;
    endTo = shiftTime(endFrom, MARKER_MINUTES);
  }

  return [
    {
      dateKey: startKey,
      task: {
        id: `${span.id}-start`,
        title: `开始 · ${span.title}`,
        startTime: startFrom,
        endTime: startTo,
        note: `长时任务开始(${range})`,
        kind: 'short',
        parentId: span.id,
        spanRole: 'start',
      },
    },
    {
      dateKey: endKey,
      task: {
        id: `${span.id}-end`,
        title: `结束 · ${span.title}`,
        startTime: endFrom,
        endTime: endTo,
        note: `长时任务结束(${range})`,
        kind: 'short',
        parentId: span.id,
        spanRole: 'end',
      },
    },
  ];
}

/** 示例计划:相对今天的天数偏移 → 当日任务(时间为示意) */
const SAMPLE_PLAN: { offset: number; tasks: Omit<Task, 'id'>[] }[] = [
  {
    offset: -3,
    tasks: [
      { title: '整理上周资料', startTime: '10:00', endTime: '10:40', note: '归档到网盘' },
      { title: '健身 1 小时', startTime: '19:00', endTime: '20:00' },
    ],
  },
  {
    offset: -2,
    tasks: [
      { title: '项目评审会', startTime: '14:00', endTime: '15:30', note: '会议室 A' },
    ],
  },
  {
    offset: -1,
    tasks: [
      { title: '超市采购', startTime: '18:30', endTime: '19:15', note: '牛奶、鸡蛋' },
      { title: '视频剪辑', startTime: '20:00', endTime: '21:00' },
    ],
  },
  {
    offset: 0,
    tasks: [
      { title: '晨跑 3 公里', startTime: '07:30', endTime: '08:10', note: '沿江绿道' },
      { title: '吃早餐', startTime: '08:00', endTime: '08:20' },
      { title: '团队站会', startTime: '09:30', endTime: '10:00', note: '汇报本周进度' },
      { title: '午饭', startTime: '12:00', endTime: '12:40' },
      { title: '写周报', startTime: '15:00', endTime: '15:30', note: '整理本周任务完成情况' },
      { title: '阅读 30 分钟', startTime: '19:30', endTime: '20:00', note: '《设计模式》' },
      { title: '睡前复盘', startTime: '22:30', endTime: '22:45' },
    ],
  },
  {
    offset: 1,
    tasks: [
      { title: '牙医复诊', startTime: '10:30', endTime: '11:00', note: '市口腔医院' },
      { title: '朋友聚餐', startTime: '18:00', endTime: '20:30', note: '海底捞' },
    ],
  },
  {
    offset: 2,
    tasks: [{ title: '月度总结', startTime: '16:00', endTime: '17:00', note: '提交给主管' }],
  },
  {
    offset: 3,
    tasks: [],
  },
  {
    offset: 4,
    tasks: [
      { title: '家庭大扫除', startTime: '09:00', endTime: '11:00' },
      { title: '给车做保养', startTime: '14:30', endTime: '16:00', note: '4S 店' },
      { title: '夜跑 5 公里', startTime: '20:00', endTime: '20:50' },
    ],
  },
];

/** 用示例计划构建初始任务状态(按日期键分组) */
export function buildInitialTasks(): TasksState {
  const today = new Date();
  const state: TasksState = {};
  for (const plan of SAMPLE_PLAN) {
    const d = new Date(today);
    d.setDate(d.getDate() + plan.offset);
    const key = dateKeyOf(d);
    state[key] = plan.tasks.map((t, i) => ({ ...t, id: `${key}-${i}` }));
  }
  return state;
}
