import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { TaskSettingsModal } from './TaskSettingsModal';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
}

/** 任务卡片:起止时间 + 标题/备注 + 提醒标记 + 完成状态 + 设置入口 */
export function TaskCard({ task, past }: Props) {
  const { updateTask } = useTasks();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View style={[styles.card, past && styles.past]}>
      <Text style={styles.time}>
        {task.startTime}–{task.endTime}
      </Text>
      <View style={styles.body}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
      </View>
      {task.remindAdvanceMinutes != null && <Text style={styles.bell}>🔔</Text>}
      <Pressable onPress={() => updateTask(task.id, { done: !task.done })} hitSlop={8}>
        <Text style={[styles.status, task.done && styles.statusDone]}>
          {task.done ? '✓' : '○'}
        </Text>
      </Pressable>
      <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
        <Text style={styles.gear}>⚙️</Text>
      </Pressable>

      <TaskSettingsModal
        visible={settingsOpen}
        task={task}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  past: {
    opacity: 0.5,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
    minWidth: 80,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bell: {
    fontSize: 14,
  },
  status: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  statusDone: {
    color: '#10B981',
  },
  gear: {
    fontSize: 16,
    color: '#6B7280',
  },
});
