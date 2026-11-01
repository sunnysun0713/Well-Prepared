import type { Task } from '@/data/tasks';
import { dateLabel, normalizeDate, normalizeTime } from './parse';
import type { ExtractedTask, ImportDraft } from './types';

/** 导入执行:把提取/编辑后的条目归一化并写入任务数据层。 */

/** 提取结果 → 编辑条目(默认全选,日期转友好标签供界面展示/编辑) */
export function draftsOf(tasks: ExtractedTask[], today: Date): ImportDraft[] {
  return tasks.map((t) => ({
    selected: true,
    title: t.title,
    dateText: dateLabel(t.dateKey, today),
    startText: t.startTime,
    endText: t.endTime,
    note: t.note ?? '',
  }));
}

/** 导入时自动应用的提醒设置(闹钟与短信提醒各自独立) */
export interface ImportReminderOptions {
  remindAdvanceMinutes?: number | null;
  remindSound?: string;
  smsRemindAdvanceMinutes?: number | null;
  smsRemindSound?: string;
}

/**
 * 勾选的条目归一化为任务写入参数;标题为空或时间无效的条目被丢弃。
 * 传入提醒设置时,所有导入任务自动带上对应提醒与铃声。
 */
export function buildImportTasks(
  items: ImportDraft[],
  today: Date,
  reminders?: ImportReminderOptions,
): { date: Date; task: Task }[] {
  const out: { date: Date; task: Task }[] = [];
  items.forEach((it, index) => {
    if (!it.selected) return;
    const title = it.title.trim();
    if (!title) return;
    const start = normalizeTime(it.startText);
    let end = normalizeTime(it.endText);
    // 只有起始时间有效时保留;结束时间不晚于起始时间时丢弃
    if (!start) end = '';
    else if (end && end <= start) end = '';
    const key = normalizeDate(it.dateText, today);
    const [y, m, d] = key.split('-').map(Number);
    const remindMinutes = reminders?.remindAdvanceMinutes ?? undefined;
    const smsMinutes = reminders?.smsRemindAdvanceMinutes ?? undefined;
    out.push({
      date: new Date(y, m - 1, d),
      task: {
        id: `${key}-t${Date.now()}-${index}`,
        title,
        startTime: start,
        endTime: end,
        note: it.note.trim() || undefined,
        remindAdvanceMinutes: remindMinutes,
        remindSound: remindMinutes != null ? reminders?.remindSound : undefined,
        smsRemindAdvanceMinutes: smsMinutes,
        smsRemindSound: smsMinutes != null ? reminders?.smsRemindSound : undefined,
      },
    });
  });
  return out;
}

/** 归一化并写入任务数据层,返回实际写入条数 */
export function commitImport(
  items: ImportDraft[],
  addTask: (date: Date, task: Task) => void,
  reminders?: ImportReminderOptions,
): number {
  const built = buildImportTasks(items, new Date(), reminders);
  built.forEach(({ date, task }) => addTask(date, task));
  return built.length;
}
