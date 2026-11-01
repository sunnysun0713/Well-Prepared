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

/**
 * 勾选的条目归一化为任务写入参数;标题为空或时间无效的条目被丢弃。
 * remindAdvanceMinutes 传入时,所有导入任务自动设置该提醒。
 */
export function buildImportTasks(
  items: ImportDraft[],
  today: Date,
  remindAdvanceMinutes?: number | null,
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
    out.push({
      date: new Date(y, m - 1, d),
      task: {
        id: `${key}-t${Date.now()}-${index}`,
        title,
        startTime: start,
        endTime: end,
        note: it.note.trim() || undefined,
        remindAdvanceMinutes: remindAdvanceMinutes ?? undefined,
      },
    });
  });
  return out;
}

/** 归一化并写入任务数据层,返回实际写入条数 */
export function commitImport(
  items: ImportDraft[],
  addTask: (date: Date, task: Task) => void,
  remindAdvanceMinutes?: number | null,
): number {
  const built = buildImportTasks(items, new Date(), remindAdvanceMinutes);
  built.forEach(({ date, task }) => addTask(date, task));
  return built.length;
}
