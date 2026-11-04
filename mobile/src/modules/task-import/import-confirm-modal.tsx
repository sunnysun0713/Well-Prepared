import { useState } from 'react';
import { AddTaskModal } from '@/components/AddTaskModal';
import { dateLabel } from '@/ai/parse';
import { useAiSettings } from '@/ai/settings';
import type { ExtractedTask } from '@/ai/types';
import { parseDateKey, type Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';

interface Props {
  visible: boolean;
  tasks: ExtractedTask[];
  onClose: () => void;
  /** 导入完成后回调实际写入条数 */
  onImport: (count: number) => void;
}

/** 提取结果 → 任务表单预填值(不写入任务层,真实 id 由新增弹窗生成) */
function formTaskOf(task: ExtractedTask): Task {
  const isSpan = Boolean(task.endDateKey);
  return {
    id: `import-${task.dateKey}-${task.endDateKey ?? 'single'}`,
    title: task.title,
    startTime: task.startTime,
    endTime: task.endTime,
    note: task.note,
    kind: isSpan ? 'span' : 'short',
    startDateKey: isSpan ? task.dateKey : undefined,
    endDateKey: task.endDateKey,
  };
}

/**
 * 手动确认:逐条套用「新增任务」弹窗,长时/短时任务分别显示对应的设置模板。
 * 确认一条即写入一条,最后一条确认后结束;取消/跳过不会写入当前条。
 */
export function ImportConfirmModal({ visible, tasks, onClose, onImport }: Props) {
  const { addTask } = useTasks();
  const { settings } = useAiSettings();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [index, setIndex] = useState(0);
  const [imported, setImported] = useState(0);

  // 每次打开从第一条开始
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setIndex(0);
      setImported(0);
    }
  }

  if (!visible || index >= tasks.length) return null;
  const current = tasks[index];
  const date = parseDateKey(current.dateKey) ?? new Date();
  const isLast = index === tasks.length - 1;

  const finish = (total: number) => {
    if (total > 0) onImport(total);
    onClose();
  };
  const advance = (nextImported: number) => {
    if (isLast) finish(nextImported);
    else setIndex(index + 1);
  };

  return (
    <AddTaskModal
      key={index}
      visible
      date={date}
      initialTask={{
        ...formTaskOf(current),
        // 把「规划」里的导入提醒预填到表单,用户能看见并随时改
        remindAdvanceMinutes: settings.importReminderMinutes ?? undefined,
        remindSound:
          settings.importReminderMinutes != null ? settings.importReminderSound : undefined,
        smsRemindAdvanceMinutes: settings.importSmsRemindMinutes ?? undefined,
        smsRemindSound:
          settings.importSmsRemindMinutes != null ? settings.importSmsRemindSound : undefined,
      }}
      lockKind
      progressText={
        current.endDateKey
          ? `第 ${index + 1} / ${tasks.length} 条`
          : `第 ${index + 1} / ${tasks.length} 条 · ${dateLabel(current.dateKey, new Date())}`
      }
      submitLabel={isLast ? '完成导入' : '下一条'}
      onClose={() => finish(imported)}
      onSkip={() => advance(imported)}
      onSubmit={(task, startDate) => {
        addTask(startDate, task);
        const next = imported + 1;
        setImported(next);
        advance(next);
      }}
    />
  );
}
