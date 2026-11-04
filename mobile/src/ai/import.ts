import { dayIndex, type Task } from '@/data/tasks';
import { dateLabel, normalizeDate, normalizeTime, tryNormalizeDate } from './parse';
import type { ExtractedTask, ImportDraft } from './types';

/** 导入执行:把提取/编辑后的条目归一化并写入任务数据层。 */

/** 提取结果 → 编辑条目(默认全选,日期转友好标签供界面展示/编辑) */
export function draftsOf(tasks: ExtractedTask[], today: Date): ImportDraft[] {
  return tasks.map((t) => ({
    selected: true,
    title: t.title,
    dateText: dateLabel(t.dateKey, today),
    endDateText: t.endDateKey ? dateLabel(t.endDateKey, today) : '',
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
    let start = normalizeTime(it.startText);
    let end = normalizeTime(it.endText);
    let startKey = normalizeDate(it.dateText, today);
    let endKey = it.endDateText.trim() ? tryNormalizeDate(it.endDateText, today) : null;
    // 结束日早于开始日时交换;同一天视为单日任务
    if (endKey) {
      const startIndex = dayIndex(startKey);
      const endIndex = dayIndex(endKey);
      if (startIndex != null && endIndex != null && endIndex < startIndex) {
        [startKey, endKey] = [endKey, startKey];
      } else if (startIndex != null && endIndex === startIndex) {
        endKey = null;
      }
    }
    const isSpan = endKey != null;
    // 单日任务:结束时间不晚于起始时间时丢弃;跨多天任务保留原时刻(可没有时刻)
    if (!isSpan) {
      if (!start) end = '';
      else if (end && end <= start) end = '';
    }
    const [y, m, d] = startKey.split('-').map(Number);
    const remindMinutes = reminders?.remindAdvanceMinutes ?? undefined;
    const smsMinutes = reminders?.smsRemindAdvanceMinutes ?? undefined;
    out.push({
      date: new Date(y, m - 1, d),
      task: {
        id: `${startKey}-t${Date.now()}-${index}`,
        title,
        startTime: start,
        endTime: end,
        note: it.note.trim() || undefined,
        ...(isSpan
          ? { kind: 'span' as const, startDateKey: startKey, endDateKey: endKey as string }
          : {}),
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
